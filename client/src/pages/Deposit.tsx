import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, Wallet, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { depositSchema, type InsertDeposit } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function Deposit() {
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertDeposit>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: '',
      currency: 'USDT',
      walletAddress: '',
    },
  });

  const { data: walletAddress } = useQuery<{ address: string }>({
    queryKey: ['/api/wallet-address'],
  });

  const { data: deposits, isLoading } = useQuery<any[]>({
    queryKey: ['/api/deposits'],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: InsertDeposit) => {
      return apiRequest('POST', '/api/deposit', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deposits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      toast({
        title: "Deposit initiated",
        description: "Your deposit is being processed. It will be confirmed shortly.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Deposit failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopyAddress = () => {
    if (walletAddress?.address) {
      navigator.clipboard.writeText(walletAddress.address);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onSubmit = (values: InsertDeposit) => {
    depositMutation.mutate({
      ...values,
      currency: selectedCurrency,
      walletAddress: walletAddress?.address || '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/20 text-success border-success/30';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'failed':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">Deposit Crypto</h1>
        <p className="text-muted-foreground">Add funds to your account using cryptocurrency.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Make a Deposit</CardTitle>
              <CardDescription>Choose your currency and enter the amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Currency</Label>
                <div className="flex gap-2">
                  {['USDT', 'ETH', 'BTC'].map((currency) => (
                    <Button
                      key={currency}
                      variant={selectedCurrency === currency ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedCurrency(currency);
                        form.setValue('currency', currency);
                      }}
                      className={selectedCurrency === currency ? 'bg-primary' : ''}
                      data-testid={`button-currency-${currency}`}
                    >
                      {currency}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deposit Address ({selectedCurrency})</Label>
                <div className="flex gap-2">
                  <Input
                    value={walletAddress?.address || 'Loading...'}
                    readOnly
                    className="bg-secondary border-border font-mono text-sm"
                    data-testid="input-wallet-address"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAddress}
                    data-testid="button-copy-address"
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send {selectedCurrency} to this address. Minimum deposit: 10 {selectedCurrency}
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={`Enter ${selectedCurrency} amount`}
                            className="bg-secondary border-border"
                            data-testid="input-deposit-amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={depositMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
                    data-testid="button-confirm-deposit"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    {depositMutation.isPending ? 'Processing...' : 'Confirm Deposit'}
                  </Button>
                </form>
              </Form>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-primary-foreground/90">
                  <strong>Note:</strong> This is a demo environment. Deposits are simulated and will be confirmed automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>Track your recent deposits</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : deposits && deposits.length > 0 ? (
                <div className="space-y-3">
                  {deposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="p-4 rounded-lg bg-secondary border border-border hover-elevate"
                      data-testid={`deposit-${deposit.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(deposit.status)}
                          <Badge className={getStatusColor(deposit.status)} data-testid={`badge-${deposit.status}`}>
                            {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-crypto">
                            +{parseFloat(deposit.amount).toFixed(2)} {deposit.currency}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(deposit.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {deposit.transactionHash && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono truncate">TX: {deposit.transactionHash}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No deposits yet. Make your first deposit to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
