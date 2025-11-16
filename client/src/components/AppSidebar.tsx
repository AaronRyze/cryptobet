import { Wallet, Gamepad2, Receipt, Settings, LogOut, Coins, Disc3, TowerControl, TrendingUp, Dices, Bomb } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const menuItems = [
  { title: 'Deposit', url: '/deposit', icon: Wallet },
];

const gameItems = [
  { title: 'Coin Flip', url: '/play/coinflip', icon: Coins },
  { title: 'Roulette', url: '/play/roulette', icon: Disc3 },
  { title: 'Skyscraper', url: '/play/tower', icon: TowerControl },
  { title: 'Crash', url: '/play/crash', icon: TrendingUp },
  { title: 'Dice', url: '/play/dice', icon: Dices },
  { title: 'Mines', url: '/play/mines', icon: Bomb },
];

const otherItems = [
  { title: 'Transactions', url: '/transactions', icon: Receipt },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: balance } = useQuery<{ amount: string; currency: string }>({
    queryKey: ['/api/balance'],
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">CryptoBet</h2>
                <p className="text-xs text-muted-foreground">Premium Betting</p>
              </div>
            </div>
          </div>
          <Separator className="bg-sidebar-border" />
          <SidebarGroupLabel className="px-4 py-4 text-xs text-muted-foreground uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={`
                        px-4 py-2.5 rounded-lg mx-2 transition-all
                        ${isActive 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }
                      `}
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">
            Games
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gameItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={`
                        px-4 py-2.5 rounded-lg mx-2 transition-all
                        ${isActive 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }
                      `}
                      data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <a href={item.url}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={`
                        px-4 py-2.5 rounded-lg mx-2 transition-all
                        ${isActive 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }
                      `}
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Card className="p-4 bg-card/50 backdrop-blur border-card-border">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-2xl font-mono font-bold text-crypto" data-testid="text-balance">
                {balance ? `${parseFloat(balance.amount).toFixed(2)} ${balance.currency}` : '0.00 USDT'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">User</div>
              <div className="text-sm font-medium truncate" data-testid="text-username">
                {user?.username || 'Guest'}
              </div>
            </div>
            <Separator className="bg-card-border" />
            <SidebarMenuButton 
              onClick={logout} 
              className="w-full justify-start text-destructive hover:bg-destructive/10"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </div>
        </Card>
      </SidebarFooter>
    </Sidebar>
  );
}
