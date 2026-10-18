/* Advertising is kept separate from gameplay. Disabled by default.
   Only enable AFTER your ad account and website are approved, and follow the ad provider's policies.
   Never place ads over the steering controls or show them during active driving. */
(function () {
  'use strict';
  var Ads = { enabled: false };
  Ads.init = function () {
    if (!Ads.enabled) return;
    var slot = document.getElementById('ad-slot');
    if (!slot) return;
    slot.hidden = false;
    // Add your approved provider's script loader and ad unit markup here later.
  };
  window.HighwayAds = Ads;
  Ads.init();
})();
