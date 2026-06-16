#include "dht11.h"
#include "driver/gpio.h"
#include "esp_rom_sys.h"

#define DHT_PIN GPIO_NUM_4

static int wait_level(int level, int timeout_us)
{
    int count = 0;

    while (gpio_get_level(DHT_PIN) == level)
    {
        esp_rom_delay_us(1);
        count++;

        if (count > timeout_us)
            return -1;
    }

    return count;
}

bool dht11_read(float *temperature, float *humidity)
{
    uint8_t data[5] = {0};

    gpio_set_direction(DHT_PIN, GPIO_MODE_OUTPUT);
    gpio_set_level(DHT_PIN, 0);
    esp_rom_delay_us(20000);

    gpio_set_level(DHT_PIN, 1);
    esp_rom_delay_us(40);

    gpio_set_direction(DHT_PIN, GPIO_MODE_INPUT);

    if (wait_level(1, 100) < 0) return false;
    if (wait_level(0, 100) < 0) return false;
    if (wait_level(1, 100) < 0) return false;

    for (int i = 0; i < 40; i++)
    {
        if (wait_level(0, 100) < 0)
            return false;

        int high_time = wait_level(1, 100);

        if (high_time < 0)
            return false;

        data[i / 8] <<= 1;

        if (high_time > 40)
            data[i / 8] |= 1;
    }

    uint8_t checksum =
        data[0] +
        data[1] +
        data[2] +
        data[3];

    if (checksum != data[4])
        return false;

    *humidity = data[0];
    *temperature = data[2];

    return true;
}