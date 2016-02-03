# InfluxDB Storage Plugin

InfluxDB Storage Plugin for the Reekoh IoT Platform.

Uses influx npm library

**Assumptions:**

1. Data would be in JSON format
2. Data will be saved as is based on what has been sent
3. Tag keys should have been properly set in the configuration

**Process**

1. Data would be written directly to the InfluxDB host/port, database and series specified
2. Storage plugin will only do insert data operations
3. All errors will be logged and no data should be written 
4. Tag keys will be removed from the data and will be saved as tag keys


##Sample Data

```
{
  _id: _id,
  co2: '11%',
  temp: 23,
  quality: 11.25,
  reading_time: '2015-11-27T11:04:13.539Z',
  random_data: 'abcdefg',
  is_normal: true
}
```


