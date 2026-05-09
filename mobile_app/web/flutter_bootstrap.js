{{flutter_js}}
{{flutter_build_config}}

_flutter.loader.load({
  onEntrypointLoaded: async function (engineInitializer) {
    // Estabilidade Web: manter uma configuração válida no Flutter atual.
    // O renderer HTML foi removido; CanvasKit com variante Chromium evita config legada.
    const appRunner = await engineInitializer.initializeEngine({
      renderer: "canvaskit",
      canvasKitVariant: "chromium",
    });
    await appRunner.runApp();
  },
});
