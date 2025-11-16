import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

export default function Transactions() {
  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ['/api/transactions'],
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-primary" />;
      case 'bet':
        return <Activity className="h-4 w-4 text-warning" />;
      case 'win':
        return <ArrowUpRight className="h-4 w-4 text-success" />;
      default:
        return <Wallet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'bet':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'win':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getAmountColor = (type: string) => {
    if (type === 'deposit' || type === 'win') return 'text-success';
    return 'text-destructive';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'deposit' || type === 'win') return '+';
    return '-';
  };

  const filterTransactions = (filterType?: string) => {
    if (!transactions) return [];
    if (!filterType || filterType === 'all') return transactions;
    return transactions.filter((tx) => tx.type === filterType);
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">Transactions</h1>
        <p className="text-muted-foreground">View your complete transaction history.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All your deposits, bets, and winnings in one place</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="deposit" data-testid="tab-deposits">Deposits</TabsTrigger>
                <TabsTrigger value="bet" data-testid="tab-bets">Bets</TabsTrigger>
                <TabsTrigger value="win" data-testid="tab-wins">Wins</TabsTrigger>
              </TabsList>

              {['all', 'deposit', 'bet', 'win'].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filterTransactions(tab === 'all' ? undefined : tab).length > 0 ? (
                    <div className="space-y-2">
                      {filterTransactions(tab === 'all' ? undefined : tab).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary border border-border hover-elevate transition-all"
                          data-testid={`transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full ${getTypeColor(tx.type)} flex items-center justify-center`}>
                              {getIcon(tx.type)}
                            </div>
                            <div>
                              <div className="font-medium">{tx.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono font-bold text-lg ${getAmountColor(tx.type)}`}>
                              {getAmountPrefix(tx.type)}{parseFloat(tx.amount).toFixed(2)} USDT
                            </div>
                            <Badge className={getTypeColor(tx.type)} data-testid={`badge-type-${tx.type}`}>
                              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                      <p className="text-muted-foreground">
                        {tab === 'all' 
                          ? 'Your transaction history will appear here.'
                          : `No ${tab} transactions yet.`
                        }
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
