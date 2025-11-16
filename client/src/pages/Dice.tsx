import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dices } from "lucide-react";
import { GameLayout } from "@/components/GameLayout";

export default function Dice() {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState("10");
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const { data: balance } = useQuery<{ amount: string }>({
    queryKey: ['/api/balance'],
  });

  const playMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{
        roll: number;
        win: boolean;
        payout: number;
        target: number;
        direction: string;
      }>('POST', '/api/dice/play', {
        betAmount: parseFloat(betAmount),
        target,
        direction,
      });
    },
    onSuccess: (data) => {
      setLastRoll(data.roll);
      setIsRolling(false);
      
      if (data.win) {
        toast({
          title: "You Won",
          description: `Rolled ${data.roll}! Won ${data.payout.toFixed(2)} USDT`,
        });
      } else {
        toast({
          title: "Lost",
          description: `Rolled ${data.roll}. Better luck next time`,
          variant: "destructive",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      setIsRolling(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRoll = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    setIsRolling(true);
    setLastRoll(null);
    playMutation.mutate();
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  
  const winChance = direction === 'over' ? (99 - target) / 100 : target / 100;
  const multiplier = 0.98 / winChance;
  const potentialWin = parseFloat(betAmount || '0') * multiplier;

  return (
    <GameLayout
      title="Dice"
      description="Roll over or under the target number to win"
      icon={<Dices className="h-10 w-10" />}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Game Controls</CardTitle>
            <CardDescription>
              Set your bet and target number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bet-amount">Bet Amount (USDT)</Label>
              <Input
                id="bet-amount"
                data-testid="input-bet-amount"
                type="number"
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={playMutation.isPending}
                placeholder="Enter bet amount"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="font-mono font-semibold">
                {currentBalance.toFixed(2)} USDT
              </span>
            </div>

            <div className="space-y-3">
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  data-testid="button-direction-over"
                  variant={direction === 'over' ? 'default' : 'outline'}
                  onClick={() => {
                    setDirection('over');
                    if (target >= 99) setTarget(98);
                  }}
                  disabled={playMutation.isPending}
                  className="w-full"
                >
                  Roll Over
                </Button>
                <Button
                  data-testid="button-direction-under"
                  variant={direction === 'under' ? 'default' : 'outline'}
                  onClick={() => {
                    setDirection('under');
                    if (target <= 1) setTarget(2);
                  }}
                  disabled={playMutation.isPending}
                  className="w-full"
                >
                  Roll Under
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Target Number</Label>
                <span className="text-lg font-mono font-bold" data-testid="text-target">
                  {target}
                </span>
              </div>
              <Slider
                data-testid="slider-target"
                value={[target]}
                onValueChange={(value) => {
                  const newTarget = value[0];
                  if (direction === 'over' && newTarget >= 99) {
                    setTarget(98);
                  } else if (direction === 'under' && newTarget <= 1) {
                    setTarget(2);
                  } else {
                    setTarget(newTarget);
                  }
                }}
                min={direction === 'over' ? 1 : 2}
                max={direction === 'over' ? 98 : 99}
                step={1}
                disabled={playMutation.isPending}
              />
              <p className="text-xs text-muted-foreground text-center">
                {direction === 'over' ? `Win if roll > ${target}` : `Win if roll < ${target}`}
              </p>
            </div>

            <div className="space-y-2 p-3 bg-accent/20 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Win Chance:</span>
                <span className="font-semibold">{(winChance * 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Multiplier:</span>
                <span className="font-semibold">{multiplier.toFixed(2)}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Potential Win:</span>
                <span className="font-mono font-semibold text-primary">
                  {potentialWin.toFixed(2)} USDT
                </span>
              </div>
            </div>

            <Button
              data-testid="button-roll"
              onClick={handleRoll}
              disabled={playMutation.isPending}
              className="w-full"
              size="lg"
            >
              {playMutation.isPending ? "Rolling..." : "Roll Dice"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roll Result</CardTitle>
            <CardDescription>
              {lastRoll !== null ? `You rolled ${lastRoll}` : "Roll the dice to see your result"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64">
              {isRolling ? (
                <div className="flex flex-col items-center gap-4">
                  <Dices className="w-24 h-24 text-primary animate-spin" />
                  <span className="text-lg font-semibold text-muted-foreground">Rolling...</span>
                </div>
              ) : lastRoll !== null ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-9xl font-bold font-mono text-primary" data-testid="text-roll-result">
                    {lastRoll}
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Target: {direction === 'over' ? '>' : '<'} {target}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Dices className="w-24 h-24 text-muted-foreground/30" />
                  <span className="text-lg font-semibold text-muted-foreground">
                    Waiting for roll...
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Choose to roll "Over" or "Under" the target number</p>
          <p>• Set your target number (1-99)</p>
          <p>• Higher risk = higher reward (lower win chance = higher multiplier)</p>
          <p>• The dice rolls a number from 0 to 99</p>
          <p>• Win if the roll matches your prediction!</p>
        </CardContent>
      </Card>
    </GameLayout>
  );
}
