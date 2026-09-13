// Assets e insígnias geradas com IA para o Sistema Gamificado de Conquistas WAnime
import bannerHall from './images/trophy_hall_banner_1788238845972.jpg';
import badgeBronze from './images/badge_bronze_tier_1788239127558.jpg';
import badgeSilver from './images/badge_silver_tier_1788239139781.jpg';
import badgeGold from './images/badge_gold_tier_1788239156663.jpg';
import badgeDiamond from './images/badge_diamond_tier_1788239170709.jpg';
import crestShounen from './images/crest_shounen_flame_1788239184478.jpg';
import crestNight from './images/crest_night_moon_1788239194773.jpg';
import crestIsekai from './images/crest_isekai_magic_1788239211698.jpg';
import crestCollector from './images/crest_master_collector_1788239224119.jpg';

export const ACHIEVEMENT_MEDIA = {
  bannerHall,
  tierBadges: {
    bronze: badgeBronze,
    silver: badgeSilver,
    gold: badgeGold,
    platinum: badgeSilver, // ou diamond
    diamond: badgeDiamond,
  },
  crests: {
    shounen: crestShounen,
    night: crestNight,
    isekai: crestIsekai,
    collector: crestCollector,
  },
};
