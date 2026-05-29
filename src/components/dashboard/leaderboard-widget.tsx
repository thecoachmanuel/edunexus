"use client";

import { Trophy, Medal, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LeaderboardItem {
  className: string;
  averageScore: number;
  attendanceRate: number;
  totalScore: number;
}

export function ClassLeaderboardWidget({ data }: { data?: LeaderboardItem[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Class Leaderboard
          </CardTitle>
          <CardDescription>Top performing classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Trophy className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No leaderboard data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Medal className="h-5 w-5 text-yellow-500" />; // Gold
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;   // Silver
      case 2: return <Medal className="h-5 w-5 text-amber-700" />;  // Bronze
      default: return <Star className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Class Leaderboard
        </CardTitle>
        <CardDescription>Top classes by scores & attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item, index) => (
          <div key={item.className} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                {getRankIcon(index)}
              </div>
              <div>
                <p className="font-semibold text-sm">{item.className}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Score: <strong className="text-foreground">{item.averageScore}%</strong></span>
                  <span>Att: <strong className="text-foreground">{item.attendanceRate}%</strong></span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 w-24">
              <span className="text-xs font-bold text-primary">{Math.round(item.totalScore / 2)} Pts</span>
              <Progress value={Math.round(item.totalScore / 2)} className="h-1.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
