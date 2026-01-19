import 'package:flutter/material.dart';
import '../../services/theme_service.dart';

class AppTheme {
  // Cores extraídas da imagem enviada
  static Color get primaryYellow => ThemeService().currentConfig.primary; // Amarelo do fundo
  static Color get accentOrange => ThemeService().currentConfig.secondary; // Laranja do botão selecionado
  static Color get darkBlueText => ThemeService().currentConfig.textPrimary; // Azul do título "101 Service"
  static Color get lightGray => const Color(0xFFF3F4F6);

  // Adicionando cores faltantes para corrigir erros de compilação
  static Color get primaryPurple => ThemeService().currentConfig.textPrimary; // Mapeado para cor de texto principal (Azul/Verde Escuro)
  static Color get secondaryOrange => accentOrange; // Alias para accentOrange
  static Color get successGreen => const Color(0xFF4CAF50); // Verde sucesso
  static Color get errorRed => const Color(0xFFD32F2F); // Vermelho erro
  static Color get textBrown => const Color(0xFF8B4513); // Texto marrom escuro

  static ThemeData get lightTheme {
    return ThemeService().currentThemeData;
  }
}
