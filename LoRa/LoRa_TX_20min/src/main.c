#include "dht11.h"
#include <stdio.h>
#include <string.h>
#include "driver/spi_master.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define PIN_SCK  5
#define PIN_MISO 19
#define PIN_MOSI 27
#define PIN_CS   18
#define PIN_RST  14
#define PIN_DIO0 26

#define SEND_INTERVAL_MS 1200

spi_device_handle_t spi;

static void lora_write_reg(uint8_t reg, uint8_t value) {
    uint8_t out[2] = { reg | 0x80, value };

    spi_transaction_t t = {
        .length = 16,
        .tx_buffer = out,
    };
    spi_device_transmit(spi, &t);
}

static uint8_t lora_read_reg(uint8_t reg) {
    uint8_t tx[2] = { reg & 0x7F, 0x00 };
    uint8_t rx[2] = {0};

    spi_transaction_t t = {
        .length = 16,
        .tx_buffer = tx,
        .rx_buffer = rx,
    };
    spi_device_transmit(spi, &t);

    return rx[1];
}

static void lora_reset() {
    gpio_set_level(PIN_RST, 0);
    vTaskDelay(100 / portTICK_PERIOD_MS);
    gpio_set_level(PIN_RST, 1);
    vTaskDelay(100 / portTICK_PERIOD_MS);
}

static void lora_init() {
    lora_reset();

    uint8_t version = lora_read_reg(0x42);
    printf("SX1276 Version = 0x%02X\n", version);
    // modo sleep + LoRa
    lora_write_reg(0x01, 0x80);

    // frequência 915MHz (simplificado)
    lora_write_reg(0x06, 0xE4);
    lora_write_reg(0x07, 0xC0);
    lora_write_reg(0x08, 0x00);

    // power
    lora_write_reg(0x09, 0xFF);
}

static void lora_send(const char *msg) {
    lora_write_reg(0x0D, 0x00); // FIFO addr ptr

    for (int i = 0; i < strlen(msg); i++) {
        lora_write_reg(0x00, msg[i]);
    }

    lora_write_reg(0x22, strlen(msg)); // payload length

    // transmit mode
    lora_write_reg(0x01, 0x83);

    printf("Enviado: %s\n", msg);
}

void app_main(void) {

    // GPIO reset
    gpio_set_direction(PIN_RST, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_DIO0, GPIO_MODE_INPUT);

    // SPI config
    spi_bus_config_t buscfg = {
        .mosi_io_num = PIN_MOSI,
        .miso_io_num = PIN_MISO,
        .sclk_io_num = PIN_SCK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1
    };

    spi_bus_initialize(SPI2_HOST, &buscfg, 1);

    spi_device_interface_config_t devcfg = {
        .clock_speed_hz = 1 * 1000 * 1000,
        .mode = 0,
        .spics_io_num = PIN_CS,
        .queue_size = 1
    };

    spi_bus_add_device(SPI2_HOST, &devcfg, &spi);

    lora_init();

    lora_write_reg(0x0E, 0x00); // TX Base Addr
lora_write_reg(0x0F, 0x00); // RX Base Addr

// BW=125kHz, CR=4/5
lora_write_reg(0x1D, 0x72);

// SF7, CRC ON
lora_write_reg(0x1E, 0x74);

// Preamble
lora_write_reg(0x20, 0x00);
lora_write_reg(0x21, 0x08);

// Sync Word padrão LoRa
lora_write_reg(0x39, 0x34);

// Standby
lora_write_reg(0x01, 0x81);

    while (1) {

    float temperatura;
    float umidade;

    char msg[50];

    if (dht11_read(&temperatura, &umidade))
{
        sprintf(msg,
             "T:%.1f,U:%.1f",
              temperatura,
              umidade);
}
else
{
    sprintf(msg, "ERRO_DHT11");
}

        lora_send(msg);

        vTaskDelay(SEND_INTERVAL_MS / portTICK_PERIOD_MS);
    }
}