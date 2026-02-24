import {
  Mail,
  CreditCard,
  Trash2,
  Globe,
  MessageSquare,
  Package,
  Terminal,
  FileEdit,
  Calendar,
  Plug,
  UserCog,
  Activity,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  send_email: Mail,
  send_message: MessageSquare,
  make_purchase: CreditCard,
  delete_file: Trash2,
  browse_new_domain: Globe,
  install_package: Package,
  shell_command: Terminal,
  file_write: FileEdit,
  calendar_modify: Calendar,
  api_write: Plug,
  account_change: UserCog,
};

interface ActionIconProps {
  actionType: string;
  className?: string;
}

export default function ActionIcon({
  actionType,
  className = 'w-4 h-4',
}: ActionIconProps) {
  const Icon = ICON_MAP[actionType] || Activity;
  return <Icon className={className} />;
}
