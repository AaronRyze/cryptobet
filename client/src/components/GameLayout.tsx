import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GameLayoutProps {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function GameLayout({ title, description, icon, children }: GameLayoutProps) {
  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          {icon && <div className="text-primary">{icon}</div>}
          <h1 className="text-4xl font-bold">{title}</h1>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </motion.div>
      
      {children}
    </div>
  );
}
