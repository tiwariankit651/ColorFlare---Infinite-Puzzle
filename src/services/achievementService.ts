
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (data: any) => boolean;
  rewardStars: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    title: 'First Step',
    description: 'Complete your first level',
    icon: '🎯',
    condition: (data) => data.bestLevel > 1,
    rewardStars: 5
  },
  {
    id: 'level_10',
    title: 'Flow Master',
    description: 'Reach Level 10',
    icon: '🌊',
    condition: (data) => data.bestLevel >= 10,
    rewardStars: 10
  },
  {
    id: 'level_50',
    title: 'Color God',
    description: 'Reach Level 50',
    icon: '👑',
    condition: (data) => data.bestLevel >= 50,
    rewardStars: 50
  },
  {
    id: 'moves_100',
    title: 'Efficient',
    description: 'Make 100 total moves',
    icon: '⚡',
    condition: (data) => data.totalMoves >= 100,
    rewardStars: 15
  },
  {
    id: 'stars_100',
    title: 'Star Collector',
    description: 'Collect 100 stars',
    icon: '⭐',
    condition: (data) => data.stars >= 100,
    rewardStars: 20
  },
  {
    id: 'daily_3',
    title: 'Habitual',
    description: 'Complete 3 daily challenges',
    icon: '📅',
    condition: (data) => data.dailyChallengesCompleted >= 3,
    rewardStars: 25
  },
  {
    id: 'moves_1000',
    title: 'Flow Artist',
    description: 'Make 1,000 total moves',
    icon: '🎨',
    condition: (data) => data.totalMoves >= 1000,
    rewardStars: 50
  },
  {
    id: 'stars_500',
    title: 'Megastar',
    description: 'Collect 500 stars',
    icon: '✨',
    condition: (data) => data.stars >= 500,
    rewardStars: 100
  },
  {
    id: 'perfect_10',
    title: 'Perfectionist',
    description: 'Get 3 stars on 10 different levels',
    icon: '💎',
    condition: (data) => data.threeStarLevels >= 10,
    rewardStars: 30
  },
  {
    id: 'tournament_top3',
    title: 'Eclipse Legend 👑',
    description: 'Finish in the Top 3 of the Weekend Arena tournament!',
    icon: '🏆',
    condition: (data) => data.tournamentRank !== undefined && data.tournamentRank > 0 && data.tournamentRank <= 3,
    rewardStars: 100
  },
  {
    id: 'tournament_top10',
    title: 'Elite Challenger 💎',
    description: 'Finish in the Top 10 of the Weekend Arena tournament!',
    icon: '🏅',
    condition: (data) => data.tournamentRank !== undefined && data.tournamentRank > 0 && data.tournamentRank <= 10,
    rewardStars: 50
  },
  {
    id: 'tournament_top100',
    title: 'Arena Contender ✨',
    description: 'Finish in the Top 100 of the Weekend Arena tournament!',
    icon: '⭐',
    condition: (data) => data.tournamentRank !== undefined && data.tournamentRank > 0 && data.tournamentRank <= 100,
    rewardStars: 20
  }
];

export const AchievementService = {
  getNewAchievements(currentData: any): Achievement[] {
    const earned = currentData.achievements || [];
    return ACHIEVEMENTS.filter(a => !earned.includes(a.id) && a.condition(currentData));
  }
};
