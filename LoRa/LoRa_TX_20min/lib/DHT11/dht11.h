#ifndef DHT11_H
#define DHT11_H

#include <stdbool.h>

bool dht11_read(float *temperature, float *humidity);

#endif