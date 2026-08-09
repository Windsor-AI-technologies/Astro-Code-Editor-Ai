import { useUICtx } from '../../../contexts/UIContext';
import './Notification.css';

export default function Notification() {
  const { notification } = useUICtx();

  if (!notification) return null;

  return (
    <div className="notification-toast">
      <span className="notification-text">{notification}</span>
    </div>
  );
}
