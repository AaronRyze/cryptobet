import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bomb, Gem } from "lucide-react";
import { GameLayout } from "@/components/GameLayout";

export default function Mines() {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState("10");
  const [mineCount, setMineCount] = useState(3);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);

  const { data: balance } = useQuery<{ amount: string }>({
    queryKey: ['/api/balance'],
  });

  const { data: gameStatus } = useQuery<{
    hasActiveGame: boolean;
    revealedTiles?: number[];
    currentMultiplier?: number;
    potentialPayout?: number;
    betAmount?: number;
    mineCount?: number;
    gridSize?: number;
  }>({
    queryKey: ['/api/mines/status'],
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (gameStatus?.hasActiveGame && gameStatus.revealedTiles && gameStatus.currentMultiplier !== undefined) {
      setIsPlaying(true);
      setRevealedTiles(gameStatus.revealedTiles);
      setCurrentMultiplier(gameStatus.currentMultiplier);
    } else if (!gameStatus?.hasActiveGame) {
      setIsPlaying(false);
      setRevealedTiles([]);
      setCurrentMultiplier(1.0);
    }
  }, [gameStatus]);

  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/mines/start', {
        betAmount: parseFloat(betAmount),
        mineCount,
      });
    },
    onSuccess: () => {
      setIsPlaying(true);
      setRevealedTiles([]);
      setMinePositions([]);
      setCurrentMultiplier(1.0);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mines/status'] });
      toast({
        title: "Game Started",
        description: `Bet placed: ${betAmount} USDT with ${mineCount} mines`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revealMutation = useMutation({
    mutationFn: async (tileIndex: number) => {
      return await apiRequest<{
        hitMine: boolean;
        tileIndex: number;
        minePositions?: number[];
        revealedTiles?: number[];
        currentMultiplier?: number;
        potentialPayout?: number;
      }>('POST', '/api/mines/reveal', { tileIndex });
    },
    onSuccess: (data) => {
      if (data.hitMine) {
        if (data.minePositions) {
          setMinePositions(data.minePositions);
        }
        setIsPlaying(false);
        toast({
          title: "Hit a Mine",
          description: "Game over. Better luck next time",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/mines/status'] });
      } else {
        if (data.revealedTiles) {
          setRevealedTiles(data.revealedTiles);
        }
        if (data.currentMultiplier !== undefined) {
          setCurrentMultiplier(data.currentMultiplier);
        }
        toast({
          title: "Safe",
          description: `Multiplier: ${(data.currentMultiplier || 1).toFixed(2)}x`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{
        payout: number;
        multiplier: number;
      }>('POST', '/api/mines/cashout');
    },
    onSuccess: (data) => {
      setIsPlaying(false);
      toast({
        title: "Cashed Out",
        description: `Won ${data.payout.toFixed(2)} USDT at ${data.multiplier.toFixed(2)}x`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mines/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStart = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }
    startMutation.mutate();
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || revealedTiles.includes(index) || revealMutation.isPending) {
      return;
    }
    revealMutation.mutate(index);
  };

  const handleCashout = () => {
    cashoutMutation.mutate();
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  const potentialPayout = gameStatus?.potentialPayout || 0;
  const gameEnded = minePositions.length > 0;

  return (
    <GameLayout
      title="Mines"
      description="Reveal tiles to increase your multiplier, but avoid the mines!"
      icon={<Bomb className="h-10 w-10" />}
    >
      <div className="grid gap-6 lg:grid-cols-[350px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Controls</CardTitle>
              <CardDescription>
                Configure your game settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bet-amount">Bet Amount (USDT)</Label>
                <Input
                  id="bet-amount"
                  data-testid="input-bet-amount"
                  type="number"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isPlaying || startMutation.isPending}
                  placeholder="Enter bet amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mine-count">Number of Mines</Label>
                <Select
                  value={mineCount.toString()}
                  onValueChange={(value) => setMineCount(parseInt(value))}
                  disabled={isPlaying}
                >
                  <SelectTrigger data-testid="select-mine-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 5, 10, 15, 20, 24].map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} {count === 1 ? 'Mine' : 'Mines'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Balance:</span>
                <span className="font-mono font-semibold">
                  {currentBalance.toFixed(2)} USDT
                </span>
              </div>

              {!isPlaying ? (
                <Button
                  data-testid="button-start-game"
                  onClick={handleStart}
                  disabled={startMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {startMutation.isPending ? "Starting..." : "Start Game"}
                </Button>
              ) : (
                <>
                  <div className="p-3 bg-accent/20 rounded-md space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Multiplier:</span>
                      <span className="font-semibold text-primary">
                        {currentMultiplier.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Potential Payout:</span>
                      <span className="font-mono font-semibold text-primary">
                        {potentialPayout.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    data-testid="button-cashout"
                    onClick={handleCashout}
                    disabled={cashoutMutation.isPending || revealedTiles.length === 0}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    {cashoutMutation.isPending ? "Cashing Out..." : "Cash Out"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Play</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Click tiles to reveal them</p>
              <p>• Green = safe, increases multiplier</p>
              <p>• Red = mine, game over</p>
              <p>• Cash out anytime to claim winnings</p>
              <p>• More mines = higher risk & reward</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Minefield</CardTitle>
            <CardDescription>
              {isPlaying 
                ? `${revealedTiles.length} tiles revealed` 
                : gameEnded
                ? "Game over - mines revealed"
                : "Start a game to begin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
              {Array.from({ length: 25 }).map((_, index) => {
                const isRevealed = revealedTiles.includes(index);
                const isMine = minePositions.includes(index);
                const showMine = gameEnded && isMine;
                
                return (
                  <button
                    key={index}
                    data-testid={`tile-${index}`}
                    onClick={() => handleTileClick(index)}
                    disabled={!isPlaying || isRevealed || revealMutation.isPending}
                    className={`
                      aspect-square rounded-md transition-all flex items-center justify-center
                      ${!isPlaying && !gameEnded ? 'bg-muted cursor-not-allowed' : ''}
                      ${isPlaying && !isRevealed ? 'bg-card hover-elevate active-elevate-2 cursor-pointer border-2' : ''}
                      ${isRevealed ? 'bg-green-500/20 border-2 border-green-500' : ''}
                      ${showMine ? 'bg-destructive/20 border-2 border-destructive' : ''}
                    `}
                  >
                    {isRevealed && <Gem className="w-6 h-6 text-green-500" />}
                    {showMine && <Bomb className="w-6 h-6 text-destructive" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </GameLayout>
  );
}
