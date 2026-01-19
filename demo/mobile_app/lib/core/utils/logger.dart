import 'package:flutter/foundation.dart';

class AppLogger {
  static bool showDebugLogs = true;

  static void log(String message, {bool important = false}) {
    if (important || showDebugLogs) {
      // ignore: avoid_print
      print(message);
    }
  }
}

void customDebugPrint(String? message, {int? wrapWidth}) {
  if (message == null) return;
  
  // Only print if it starts with [IMPORTANT] or if debug logs are enabled
  if (message.startsWith('[IMPORTANT]') || AppLogger.showDebugLogs) {
    debugPrintThrottled(message, wrapWidth: wrapWidth);
  }
}
