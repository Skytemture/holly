import React from 'react';
import { Clock, ChefHat, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const statusConfig = {
  pending: { label: '待處理', icon: Clock, color: 'bg-accent/15 text-accent border-accent/20' },
  preparing: { label: '製作中', icon: ChefHat, color: 'bg-primary/10 text-primary border-primary/20' },
  ready: { label: '可取餐', icon: Timer, color: 'bg-chart-4/15 text-chart-4 border-chart-4/20' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: '已取消', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function OrderCard({ order, onStatusChange }) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">桌 {order.table_no}</span>
            <Badge variant="outline" className={`${status.color} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {moment(order.created_date).fromNow()}
          </p>
        </div>
        <p className="text-xl font-bold text-accent">${order.total}</p>
      </div>

      <div className="space-y-1.5 mb-4">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>{item.name} × {item.quantity}</span>
            <span className="text-muted-foreground">${item.price * item.quantity}</span>
          </div>
        ))}
        {order.addons?.map((addon, idx) => (
          <div key={`a-${idx}`} className="flex justify-between text-sm text-muted-foreground">
            <span>+ {addon.name}</span>
            <span>${addon.price}</span>
          </div>
        ))}
      </div>

      {order.note && (
        <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-4">
          📝 {order.note}
        </p>
      )}

      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(order.id, 'preparing')}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <ChefHat className="w-4 h-4 mr-1" /> 開始製作
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(order.id, 'ready')}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Timer className="w-4 h-4 mr-1" /> 完成製作
            </Button>
          )}
          {order.status === 'ready' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(order.id, 'completed')}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> 已取餐
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(order.id, 'cancelled')}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}