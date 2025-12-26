@echo off
echo Starting Zookeeper...
start "Zookeeper" cmd /k "cd kafka_2.13-3.9.1 && bin\windows\zookeeper-server-start.bat config\zookeeper.properties"

echo Waiting 10 seconds for Zookeeper to Initialize...
timeout /t 10

echo Starting Kafka...
start "Kafka" cmd /k "cd kafka_2.13-3.9.1 && bin\windows\kafka-server-start.bat config\server.properties"

echo Services started! Keep the new windows open.
pause
