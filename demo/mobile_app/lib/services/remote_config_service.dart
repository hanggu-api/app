import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';

class RemoteConfigService {
  final FirebaseRemoteConfig _remoteConfig = FirebaseRemoteConfig.instance;

  static final RemoteConfigService _instance = RemoteConfigService._internal();

  factory RemoteConfigService() {
    return _instance;
  }

  RemoteConfigService._internal();

  Future<void> initialize() async {
    try {
      await _remoteConfig.setConfigSettings(RemoteConfigSettings(
        fetchTimeout: const Duration(minutes: 1),
        minimumFetchInterval: const Duration(hours: 1),
      ));

      await _remoteConfig.setDefaults({
        'enable_fake_pix': false,
        'app_primary_color': '#FF5722',
        'support_phone': '+5511999999999',
        'min_app_version': '1.0.0',
      });

      await fetchAndActivate();
    } catch (e) {
      debugPrint('Remote Config Initialization Error: $e');
    }
  }

  Future<void> fetchAndActivate() async {
    try {
      await _remoteConfig.fetchAndActivate();
    } catch (e) {
      debugPrint('Remote Config Fetch Error: $e');
    }
  }

  bool get enableFakePix => _remoteConfig.getBool('enable_fake_pix');
  String get appPrimaryColor => _remoteConfig.getString('app_primary_color');
  String get supportPhone => _remoteConfig.getString('support_phone');
  String get minAppVersion => _remoteConfig.getString('min_app_version');

  dynamic getValue(String key) => _remoteConfig.getValue(key);
}
