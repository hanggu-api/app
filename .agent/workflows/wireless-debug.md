---
description: Como rodar o App em modo Debug via Wi-Fi (Android 11+)
---

Para rodar o app no celular sem fios usando o Wi-Fi:

1. **No Celular**:
   - Vá em **Opções do Desenvolvedor**.
   - Ative a **Depuração sem fios** (Wireless Debugging).
   - Toque no nome "Depuração sem fios" para abrir as opções.
   - Toque em **"Parear dispositivo com código de pareamento"**.

2. **No Computador (Terminal)**:
   - Use o IP e a Porta que apareceram na tela de pareamento:
   ```bash
   adb pair [IP]:[PORTA_DE_PAREAMENTO]
   ```
   - Digite o código de pareamento quando solicitado.

3. **Conectar**:
   - Agora use o IP e a Porta principal que aparece na tela inicial da "Depuração sem fios":
   ```bash
   adb connect [IP]:[PORTA_CONEXAO]
   ```

4. **Rodar o App**:
   - Verifique se o dispositivo aparece na lista:
   ```bash
   flutter devices
   ```
   - Rode o app (o comando abaixo vai rodar no seu celular via Wi-Fi):
   ```bash
   flutter run
   ```
