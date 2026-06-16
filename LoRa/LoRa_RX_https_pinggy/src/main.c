#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <time.h>

#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_event.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_sntp.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "nvs_flash.h"

#define TAG "LORA_RX"

#define WIFI_SSID "COLOQUE_O_NOME_DO_WIFI"
#define WIFI_PASS "COLOQUE_A_SENHA_DO_WIFI"

#define API_HOST "https://xpwwr-2804-7f0-7543-9b76-f926-36b1-3b08-b82d.run.pinggy-free.link"
#define API_LOGIN_URL API_HOST "/api/auth/login"
#define API_OBSERVATIONS_URL API_HOST "/api/observations/"
#define API_EMAIL "testelora@email.com"
#define API_PASSWORD "senha123"

#define DEVICE_ID 3
#define SEND_INTERVAL_MS 1200000

#define PIN_SCK 5
#define PIN_MISO 19
#define PIN_MOSI 27
#define PIN_CS 18
#define PIN_RST 14
#define PIN_DIO0 26

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT BIT1
#define WIFI_MAX_RETRY 10
#define HTTP_QUEUE_LENGTH 3
#define HTTP_TASK_STACK 12288

static spi_device_handle_t spi;
static EventGroupHandle_t wifi_events;
static QueueHandle_t http_queue;
static int wifi_retry = 0;

static char access_token[4096];
static char auth_header[4200];
static char login_response[4096];
static char post_response[2048];

typedef struct
{
    char payload[100];
} lora_item_t;

typedef struct
{
    char *data;
    int size;
    int used;
} http_buffer_t;

static void wifi_handler(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START)
    {
        esp_wifi_connect();
    }
    else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED)
    {
        if (wifi_retry < WIFI_MAX_RETRY)
        {
            wifi_retry++;
            esp_wifi_connect();
            ESP_LOGW(TAG, "Tentando reconectar ao WiFi");
        }
        else
        {
            xEventGroupSetBits(wifi_events, WIFI_FAIL_BIT);
        }
    }
    else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP)
    {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)data;
        wifi_retry = 0;
        ESP_LOGI(TAG, "IP recebido: " IPSTR, IP2STR(&event->ip_info.ip));
        xEventGroupSetBits(wifi_events, WIFI_CONNECTED_BIT);
    }
}

static void connect_wifi(void)
{
    esp_err_t ret = nvs_flash_init();

    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    }
    else
    {
        ESP_ERROR_CHECK(ret);
    }

    wifi_events = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t wifi_instance;
    esp_event_handler_instance_t ip_instance;

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, wifi_handler, NULL, &wifi_instance));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, wifi_handler, NULL, &ip_instance));

    wifi_config_t wifi_config = {0};
    strncpy((char *)wifi_config.sta.ssid, WIFI_SSID, sizeof(wifi_config.sta.ssid));
    strncpy((char *)wifi_config.sta.password, WIFI_PASS, sizeof(wifi_config.sta.password));
    wifi_config.sta.threshold.authmode = strlen(WIFI_PASS) == 0 ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA2_PSK;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));

    EventBits_t bits = xEventGroupWaitBits(
        wifi_events,
        WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
        pdFALSE,
        pdFALSE,
        portMAX_DELAY
    );

    if (bits & WIFI_CONNECTED_BIT)
    {
        ESP_LOGI(TAG, "WiFi conectado");
    }
    else
    {
        ESP_LOGE(TAG, "Falha ao conectar no WiFi");
    }
}

static void sync_time(void)
{
    setenv("TZ", "BRT3", 1);
    tzset();

    sntp_setoperatingmode(SNTP_OPMODE_POLL);
    sntp_setservername(0, "pool.ntp.org");
    sntp_setservername(1, "time.google.com");
    sntp_init();

    time_t now = 0;
    struct tm timeinfo = {0};

    for (int i = 0; i < 15 && timeinfo.tm_year < (2020 - 1900); i++)
    {
        ESP_LOGI(TAG, "Sincronizando horario via SNTP");
        vTaskDelay(pdMS_TO_TICKS(1000));
        time(&now);
        localtime_r(&now, &timeinfo);
    }

    if (timeinfo.tm_year >= (2020 - 1900))
    {
        ESP_LOGI(TAG, "Horario sincronizado");
    }
    else
    {
        ESP_LOGW(TAG, "SNTP nao sincronizou");
    }
}

static void make_datetime(char *out, size_t size)
{
    time_t now = 0;
    struct tm timeinfo = {0};

    time(&now);
    localtime_r(&now, &timeinfo);

    if (timeinfo.tm_year >= (2020 - 1900))
    {
        strftime(out, size, "%Y-%m-%d %H:%M:%S", &timeinfo);
        return;
    }

    uint32_t seconds = (10 * 3600) + (35 * 60) + (esp_log_timestamp() / 1000);
    uint32_t day = 15 + (seconds / 86400);
    seconds %= 86400;

    snprintf(
        out,
        size,
        "2026-06-%02lu %02lu:%02lu:%02lu",
        (unsigned long)day,
        (unsigned long)(seconds / 3600),
        (unsigned long)((seconds % 3600) / 60),
        (unsigned long)(seconds % 60)
    );
}

static void lora_write(uint8_t reg, uint8_t value)
{
    uint8_t data[2] = {reg | 0x80, value};
    spi_transaction_t t = {
        .length = 16,
        .tx_buffer = data
    };
    spi_device_transmit(spi, &t);
}

static uint8_t lora_read(uint8_t reg)
{
    uint8_t tx[2] = {reg & 0x7F, 0x00};
    uint8_t rx[2] = {0};
    spi_transaction_t t = {
        .length = 16,
        .tx_buffer = tx,
        .rx_buffer = rx
    };
    spi_device_transmit(spi, &t);
    return rx[1];
}

static void lora_reset(void)
{
    gpio_set_level(PIN_RST, 0);
    vTaskDelay(pdMS_TO_TICKS(100));
    gpio_set_level(PIN_RST, 1);
    vTaskDelay(pdMS_TO_TICKS(100));
}

static void spi_init_lora(void)
{
    spi_bus_config_t buscfg = {
        .mosi_io_num = PIN_MOSI,
        .miso_io_num = PIN_MISO,
        .sclk_io_num = PIN_SCK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1
    };

    spi_device_interface_config_t devcfg = {
        .clock_speed_hz = 1000000,
        .mode = 0,
        .spics_io_num = PIN_CS,
        .queue_size = 1
    };

    spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO);
    spi_bus_add_device(SPI2_HOST, &devcfg, &spi);
}

static void lora_init(void)
{
    lora_reset();

    printf("SX1276 Version = 0x%02X\n", lora_read(0x42));

    lora_write(0x01, 0x80);
    lora_write(0x06, 0xE4);
    lora_write(0x07, 0xC0);
    lora_write(0x08, 0x00);
    lora_write(0x0E, 0x00);
    lora_write(0x0F, 0x00);
    lora_write(0x1D, 0x72);
    lora_write(0x1E, 0x74);
    lora_write(0x20, 0x00);
    lora_write(0x21, 0x08);
    lora_write(0x39, 0x34);
    lora_write(0x12, 0xFF);
    lora_write(0x01, 0x81);

    vTaskDelay(pdMS_TO_TICKS(50));
    lora_write(0x01, 0x85);

    ESP_LOGI(TAG, "LoRa inicializado");
}

static bool lora_receive(char *out, size_t size)
{
    if (!(lora_read(0x12) & 0x40))
    {
        return false;
    }

    int len = lora_read(0x13);

    if (len <= 0 || len >= size)
    {
        lora_write(0x12, 0xFF);
        return false;
    }

    lora_write(0x0D, lora_read(0x10));

    for (int i = 0; i < len; i++)
    {
        out[i] = lora_read(0x00);
    }

    out[len] = '\0';
    lora_write(0x12, 0xFF);

    return true;
}

static bool parse_payload(const char *payload, float *temperature, float *humidity)
{
    float t = 0;
    float h = 0;

    if (sscanf(payload, "T:%f,U:%f", &t, &h) != 2)
    {
        return false;
    }

    if (temperature)
    {
        *temperature = t;
    }

    if (humidity)
    {
        *humidity = h;
    }

    return true;
}

static esp_err_t http_handler(esp_http_client_event_t *event)
{
    if (event->event_id != HTTP_EVENT_ON_DATA || event->user_data == NULL)
    {
        return ESP_OK;
    }

    http_buffer_t *buffer = (http_buffer_t *)event->user_data;
    int free_space = buffer->size - buffer->used - 1;

    if (free_space <= 0)
    {
        return ESP_OK;
    }

    int copy_len = event->data_len < free_space ? event->data_len : free_space;
    memcpy(buffer->data + buffer->used, event->data, copy_len);
    buffer->used += copy_len;
    buffer->data[buffer->used] = '\0';

    return ESP_OK;
}

static bool json_get_string(const char *json, const char *key, char *out, size_t out_size)
{
    char search[64];
    snprintf(search, sizeof(search), "\"%s\"", key);

    const char *p = strstr(json, search);

    if (!p)
    {
        return false;
    }

    p = strchr(p, ':');

    if (!p)
    {
        return false;
    }

    p++;

    while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n')
    {
        p++;
    }

    if (*p != '"')
    {
        return false;
    }

    p++;

    size_t i = 0;

    while (*p && *p != '"' && i + 1 < out_size)
    {
        out[i++] = *p++;
    }

    out[i] = '\0';
    return i > 0;
}

static esp_err_t post_json(const char *url, const char *json, const char *token, char *response, int response_size, int *status)
{
    http_buffer_t buffer = {
        .data = response,
        .size = response_size,
        .used = 0
    };

    if (response && response_size > 0)
    {
        response[0] = '\0';
    }

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 5000,
        .event_handler = http_handler,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .user_data = &buffer,
        .buffer_size = 8192,
        .buffer_size_tx = 2048
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");

    if (token && strlen(token) > 0)
    {
        snprintf(auth_header, sizeof(auth_header), "Bearer %s", token);
        esp_http_client_set_header(client, "Authorization", auth_header);
    }

    esp_http_client_set_post_field(client, json, strlen(json));

    esp_err_t err = esp_http_client_perform(client);
    *status = err == ESP_OK ? esp_http_client_get_status_code(client) : 0;

    esp_http_client_cleanup(client);
    return err;
}

static bool login(void)
{
    char json[160];
    int status = 0;

    snprintf(json, sizeof(json), "{\"email\":\"%s\",\"password\":\"%s\"}", API_EMAIL, API_PASSWORD);

    esp_err_t err = post_json(API_LOGIN_URL, json, NULL, login_response, sizeof(login_response), &status);

    if (err != ESP_OK || (status != 200 && status != 201))
    {
        ESP_LOGE(TAG, "Falha no login. HTTP status: %d", status);
        return false;
    }

    if (!json_get_string(login_response, "access_token", access_token, sizeof(access_token)))
    {
        ESP_LOGE(TAG, "access_token nao encontrado");
        return false;
    }

    ESP_LOGI(TAG, "Login realizado");
    return true;
}

static void send_observation(const char *payload)
{
    float temperature = 0;
    float humidity = 0;
    char datetime[32];
    char json[256];
    int status = 0;

    if (!parse_payload(payload, &temperature, &humidity))
    {
        ESP_LOGE(TAG, "Payload invalido: %s", payload);
        return;
    }

    if (!login())
    {
        return;
    }

    make_datetime(datetime, sizeof(datetime));

    snprintf(
        json,
        sizeof(json),
        "{\"device_id\":%d,\"register\":\"%s\",\"air_humidity\":%.1f,\"air_temperature\":%.1f,\"quality_flag\":true}",
        DEVICE_ID,
        datetime,
        humidity,
        temperature
    );

    esp_err_t err = post_json(API_OBSERVATIONS_URL, json, access_token, post_response, sizeof(post_response), &status);

    if (err == ESP_OK)
    {
        ESP_LOGI(TAG, "POST /api/observations/ enviado. HTTP status: %d", status);
        ESP_LOGI(TAG, "JSON enviado: %s", json);

        if (strlen(post_response) > 0)
        {
            ESP_LOGI(TAG, "Resposta: %s", post_response);
        }
    }
    else
    {
        ESP_LOGE(TAG, "Erro no POST: %s", esp_err_to_name(err));
    }
}

static void http_task(void *params)
{
    lora_item_t item;

    while (1)
    {
        if (xQueueReceive(http_queue, &item, portMAX_DELAY) == pdTRUE)
        {
            send_observation(item.payload);
        }
    }
}

static void try_queue_payload(const char *payload)
{
    lora_item_t item = {0};
    strncpy(item.payload, payload, sizeof(item.payload) - 1);

    if (xQueueSend(http_queue, &item, 0) == pdTRUE)
    {
        ESP_LOGI(TAG, "Leitura enviada para fila HTTP");
    }
    else
    {
        ESP_LOGW(TAG, "Fila HTTP cheia, leitura descartada");
    }
}

void app_main(void)
{
    char payload[100];
    uint32_t last_send = 0;
    bool first_send = true;

    ESP_LOGI(TAG, "Inicializando RX...");

    connect_wifi();
    sync_time();

    gpio_set_direction(PIN_RST, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_DIO0, GPIO_MODE_INPUT);

    spi_init_lora();
    lora_init();

    http_queue = xQueueCreate(HTTP_QUEUE_LENGTH, sizeof(lora_item_t));

    if (!http_queue)
    {
        ESP_LOGE(TAG, "Falha ao criar fila HTTP");
        return;
    }

    xTaskCreate(http_task, "http_task", HTTP_TASK_STACK, NULL, 5, NULL);

    while (1)
    {
        if (lora_receive(payload, sizeof(payload)))
        {
            uint32_t now = esp_log_timestamp();
            ESP_LOGI(TAG, "Recebido: %s", payload);

            if (!parse_payload(payload, NULL, NULL))
            {
                ESP_LOGW(TAG, "Leitura ignorada");
            }
            else if (first_send || now - last_send >= SEND_INTERVAL_MS)
            {
                try_queue_payload(payload);
                last_send = now;
                first_send = false;
            }
            else
            {
                uint32_t remaining = SEND_INTERVAL_MS - (now - last_send);
                ESP_LOGI(TAG, "Aguardando intervalo. Proximo envio em %lu s", (unsigned long)(remaining / 1000));
            }
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
