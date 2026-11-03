/**
 * The Student Reality Checklist utilities
 * Balay Urios (Serjon) - FSUU Student Housing Hub
 * 
 * 6 Core Checklist Items:
 * 1. Building condition in good condition (rain or shine)
 * 2. Flood safe zone (elevation / dry footpath)
 * 3. Water system condition (overhead tank + booster pump)
 * 4. Brownout resilience condition (solar backup / generator)
 * 5. Mobile data speed (DITO, Smart, Globe providers)
 * 6. Wi-Fi speed (Mbps download / upload)
 */

export function getStudentChecklist(property) {
  if (!property) return null;

  // 1. Boarding House in Good Condition (Rain or Shine)
  const bCond = property.buildingCondition || property.badges?.buildingCondition || {};
  const verifiedItems = property.badges?.verifiedItems || {};
  const isConditionVerified = verifiedItems.goodCondition !== undefined
    ? Boolean(verifiedItems.goodCondition)
    : (verifiedItems.distance !== undefined 
        ? Boolean(verifiedItems.distance) 
        : Boolean(property.badges?.isUriosVerified ?? true));

  const conditionItem = {
    isCertified: isConditionVerified,
    status: bCond.status || 'Good Condition (Rain or Shine)',
    badge: bCond.badge || '☀️🌧️ Good Condition (Rain or Shine)',
    tagBadge: bCond.tagBadge || 'Rain or Shine Certified',
    roof: bCond.roofCondition || 'Inspected Leak-Free Roof',
    drainage: bCond.drainage || 'Covered Walkways & Dry Corridors',
    ventilation: bCond.ventilation || 'Well-Ventilated & Insulated',
    description: bCond.description || 'Audited structural condition: zero roof leaks during heavy monsoon rains, elevated dry walkways, and high-ceiling airflow on sunny afternoons.',
    label: 'Good Condition (Rain or Shine)'
  };

  // Distance helper (retained for commute/proximity display)
  const mainGate = property.gateProximities?.mainSFGate;
  const walkMinutes = mainGate?.walkingMinutes ?? 10;
  const distanceMeters = mainGate?.distanceMeters ?? 700;
  const isSuperClose = walkMinutes <= 5;
  const isWalkable = walkMinutes <= 12;

  const distanceItem = {
    minutes: walkMinutes,
    meters: distanceMeters,
    label: walkMinutes <= 15 ? `${walkMinutes} min walk (${distanceMeters}m)` : `1 Trike ride (₱15) to school`,
    badge: `🚶 ${walkMinutes} min walk to campus`,
    isSuperClose,
    isWalkable
  };

  // 2. Flood safe zone
  const isFloodFree = property.floodRating?.isFloodFree !== undefined
    ? Boolean(property.floodRating.isFloodFree)
    : (!property.floodRating?.badge?.toLowerCase().includes('none') && !property.floodRating?.badge?.toLowerCase().includes('prone'));
  const floodElevation = property.floodRating?.elevation || (isFloodFree ? '+2.0m High Ground Zone' : 'Ground Level (Watch Zone)');
  const floodBadge = property.floodRating?.badge || (isFloodFree ? 'Flood-Safe Zone' : 'Monsoon Watch');

  const floodItem = {
    isSafe: isFloodFree,
    elevation: floodElevation,
    badge: isFloodFree ? `🛡️ ${floodBadge}` : '⚠️ Flood Watch Zone',
    tagBadge: property.floodRating?.tagBadge || (isFloodFree ? 'Dry Footpath' : 'Surge Risk'),
    description: property.floodRating?.description || 'Audited relative to regional Agusan River surge markers.',
    history: property.floodRating?.history || 'Typhoon flood safety audit passed.'
  };

  // 3. Water system condition
  const isNoneWater = property.waterSystem?.badge?.toLowerCase().includes('none') || 
                      property.waterSystem?.badge?.toLowerCase().includes('direct tap') ||
                      property.waterSystem?.tankCapacity?.toLowerCase().includes('none');
  const hasBooster = isNoneWater ? false : Boolean(property.waterSystem?.hasBoosterPump);
  const hasTank = isNoneWater ? false : Boolean(property.waterSystem?.hasReserveTank);
  const tankCapacity = property.waterSystem?.tankCapacity || (isNoneWater ? 'Direct Tap Only' : '1,000L Overhead Tank');

  const waterItem = {
    hasBooster,
    hasTank,
    badge: (hasBooster && hasTank)
      ? '💧 24/7 Water (Tank + Booster)'
      : hasTank
      ? '💧 Reserve Water Tank'
      : isNoneWater
      ? '🚰 Direct City Tap Only'
      : '💧 Standard Gravity Water',
    capacity: tankCapacity,
    description: property.waterSystem?.description || 'Tested water pressure before 7:30 AM university classes.'
  };

  // 4. Brownout resilience condition
  const isNonePower = property.powerSystem?.badge?.toLowerCase().includes('none') ||
                      property.powerSystem?.badge?.toLowerCase().includes('no backup') ||
                      property.powerSystem?.badge?.toLowerCase().includes('no generator');
  const hasSolar = isNonePower ? false : Boolean(property.powerSystem?.hasSolarBackup);
  const hasGenerator = isNonePower ? false : Boolean(property.powerSystem?.hasGenerator);

  let powerBadge = '⚡ Basic Battery Lights';
  if (isNonePower) powerBadge = '🔌 Standard Grid (No Backup)';
  else if (hasSolar) powerBadge = '⚡ Solar Emergency Backup';
  else if (hasGenerator) powerBadge = '⚡ Standby Generator';

  const powerItem = {
    hasSolar,
    hasGenerator,
    hasBackup: !isNonePower && (hasSolar || hasGenerator),
    badge: powerBadge,
    description: property.powerSystem?.description || 'Maintains common area illumination during ANECO blackouts.'
  };

  // 5. Mobile data speed (DITO, Smart, Globe)
  const carrierSignals = property.wifiAudit?.carrierSignals || {};
  const globeText = carrierSignals.globe || '4G LTE • 4 Bars';
  const smartText = carrierSignals.smart || '4G LTE • 4 Bars';
  const ditoText = carrierSignals.dito || '4G • 3 Bars';

  // Determine carrier ratings
  const parseCarrier = (text, defaultSpeed = 35) => {
    const is5G = text.includes('5G');
    const isFull = text.includes('Full') || text.includes('5 Bars');
    let speed = defaultSpeed;
    if (is5G && isFull) speed = 50;
    else if (is5G) speed = 42;
    else if (isFull) speed = 35;
    return {
      text,
      is5G,
      isFull,
      speedMbps: speed,
      badge: is5G ? `${isFull ? '5G Full Bars' : '5G Fast'}` : '4G LTE'
    };
  };

  const mobileItem = {
    globe: parseCarrier(globeText, 45),
    smart: parseCarrier(smartText, 40),
    dito: parseCarrier(ditoText, 38),
    badge: '📶 Mobile: DITO • Smart • Globe',
    has5G: globeText.includes('5G') || smartText.includes('5G') || ditoText.includes('5G')
  };

  // 6. Wi-Fi speed
  const isNoneWifi = property.wifiAudit?.hasWifi === false || 
                     property.wifiAudit?.provider?.toLowerCase().includes('none') ||
                     (property.wifiAudit?.downloadMbps !== undefined && Number(property.wifiAudit?.downloadMbps) === 0);
  const downloadMbps = isNoneWifi ? 0 : (Number(property.wifiAudit?.downloadMbps) || 40);
  const uploadMbps = isNoneWifi ? 0 : (Number(property.wifiAudit?.uploadMbps) || 25);
  const wifiProvider = isNoneWifi ? 'None (No Wi-Fi)' : (property.wifiAudit?.provider || 'Fiber Internet');

  const wifiItem = {
    hasWifi: !isNoneWifi && downloadMbps > 0,
    downloadMbps,
    uploadMbps,
    provider: wifiProvider,
    badge: isNoneWifi ? '❌ No In-House Wi-Fi' : `🌐 ${downloadMbps} Mbps Fiber Wi-Fi`,
    isFast: downloadMbps >= 45,
    isUltraFast: downloadMbps >= 60
  };

  return {
    goodCondition: conditionItem,
    distance: distanceItem,
    floodSafe: floodItem,
    waterSystem: waterItem,
    brownoutResilience: powerItem,
    mobileData: mobileItem,
    wifi: wifiItem
  };
}
