/**
 * Root namespace for Fast Dungeons.
 * The game runs from file:// so ES modules are not available. Every file adds
 * its classes to one of these sub-namespaces instead, like a C# namespace.
 * Load order (see index.html): core -> data -> dungeons -> model -> rules -> ui -> main.
 */
window.FD = window.FD || {};
FD.Core = FD.Core || {};
FD.Enums = FD.Enums || {};
FD.Data = FD.Data || {};
FD.Dungeons = FD.Dungeons || {};
FD.Model = FD.Model || {};
FD.Rules = FD.Rules || {};
FD.UI = FD.UI || {};
FD.UI.Screens = FD.UI.Screens || {};
FD.UI.Components = FD.UI.Components || {};
FD.Tests = FD.Tests || {};
