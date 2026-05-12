
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
  }
];

export const AchievementService = {
  getNewAchievements(currentData: any): Achievement[] {
    const earned = currentData.achievements || [];
    return ACHIEVEMENTS.filter(a => !earned.includes(a.id) && a.condition(currentData));
  }
};
