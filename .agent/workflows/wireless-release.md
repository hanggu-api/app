---
description: Como instalar a versão de lançamento (Release) via Wi-Fi
---

// turbo-all
1. Preparar o ADB para conexão sem fio (Certifique-se que o celular está no USB):
```
adb tcpip 5555
```

2. Conectar ao celular via Wi-Fi (IP detectado: 192.168.1.4):
```
adb connect 192.168.1.4:5555
```

3. (Opcional) Você pode desconectar o cabo USB agora.

4. Rodar o aplicativo em modo Release no seu dispositivo:
```
flutter run --release -d 192.168.1.4:5555
```
