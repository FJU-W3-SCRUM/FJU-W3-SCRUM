# create sample.csv
@"
student_no,name,email,class_id
s001,Alan Turing,alan@uni.edu,1
s002,Ada Lovelace,ada@uni.edu,1
"@ > sample.csv

# POST CSV to API
curl -X POST http://localhost:3000/api/import -H "Content-Type: text/csv" --data-binary "@sample.csv"