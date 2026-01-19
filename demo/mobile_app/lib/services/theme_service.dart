import 'package:flutter/material.dart';

class ThemeConfig {
  final Color primary;
  final Color secondary;
  final Color background;
  final Color textPrimary;

  ThemeConfig({
    required this.primary,
    required this.secondary,
    required this.background,
    required this.textPrimary,
  });

  factory ThemeConfig.fromJson(Map<String, dynamic> json) {
    return ThemeConfig(
      primary: _parseColor(json['primary']),
      secondary: _parseColor(json['secondary']),
      background: _parseColor(json['background']),
      textPrimary: _parseColor(json['text_primary']),
    );
  }

  static Color _parseColor(String hex) {
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) {
      hex = 'FF$hex';
    }
    return Color(int.parse(hex, radix: 16));
  }

  // Default Client Theme (Vibrant Yellow & Black)
  static ThemeConfig get defaultClient => ThemeConfig(
    primary: const Color(0xFFFFD700),
    secondary: const Color(0xFF000000),
    background: Colors.white,
    textPrimary: const Color(0xFF000000),
  );

  // Default Provider Theme (Vibrant Yellow & Black)
  static ThemeConfig get defaultProvider => ThemeConfig(
    primary: const Color(0xFFFFD700),
    secondary: const Color(0xFF000000),
    background: Colors.white,
    textPrimary: const Color(0xFF000000),
  );
}

class ThemeService extends ChangeNotifier {
  static final ThemeService _instance = ThemeService._internal();
  factory ThemeService() => _instance;
  ThemeService._internal();

  ThemeConfig _clientConfig = ThemeConfig.defaultClient;
  final ThemeConfig _providerConfig = ThemeConfig.defaultProvider;

  bool _isProviderMode = false;

  ThemeConfig get currentConfig =>
      _isProviderMode ? _providerConfig : _clientConfig;

  Future<void> loadTheme() async {
    // Force default client theme for now to ensure black & white look
    _clientConfig = ThemeConfig.defaultClient;
    notifyListeners();
    return;

    /*
    try {
      // Try to load from cache first
      final prefs = await SharedPreferences.getInstance();
      final cachedTheme = prefs.getString('theme_config');

      if (cachedTheme != null) {
        _parseAndApply(jsonDecode(cachedTheme));
      }

      // Fetch from API
      final response = await http.get(
        Uri.parse('${ApiService.baseUrl}/settings/theme'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          _parseAndApply(data['data']);
          // Cache it
          await prefs.setString('theme_config', jsonEncode(data['data']));
        }
      }
    } catch (e) {
      debugPrint('Error loading theme: $e');
    }
    */
  }

  /*
  void _parseAndApply(Map<String, dynamic> data) {
    if (data.containsKey('client')) {
      _clientConfig = ThemeConfig.fromJson(data['client']);
    }
    if (data.containsKey('provider')) {
      _providerConfig = ThemeConfig.fromJson(data['provider']);
    }
    notifyListeners();
  }
  */

  void setProviderMode(bool isProvider) {
    if (_isProviderMode != isProvider) {
      _isProviderMode = isProvider;
      notifyListeners();
    }
  }

  ThemeData get currentThemeData {
    final config = currentConfig;
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: config.primary,
        primary: config.primary,
        secondary: config.secondary,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: config.background,
      appBarTheme: AppBarTheme(
        backgroundColor: config.primary,
        foregroundColor: config.textPrimary,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: config.textPrimary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: config.secondary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
