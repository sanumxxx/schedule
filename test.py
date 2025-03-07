import requests

url = 'http://localhost:5000/api/quick_add_schedule'
data = {
        "semester" : 1,
		"week_number" : 1,
		"group_name" : "2411-0101.1",
		"course" : 1,
		"faculty" : "Технический факультет",
		"subject" : "Дискретная математика",
		"lesson_type" : "пр.",
		"subgroup" : 0,
		"date" : "2024-01-02",
		"time_start" : "08:00",
		"time_end" : "09:20",
		"weekday" : 2,
		"teacher_name" : "Покуса Т.В.",
		"auditory" : "7.201",
		"created_at" : "2025-01-25 14:54:42",
		"updated_at" : "2025-01-25 14:54:42"

}

response = requests.post(url, json=data)
print(response.json())