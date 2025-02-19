import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames'; // v2.3.2
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0
import { 
    INotification, 
    NotificationType, 
    NotificationPriority, 
    NotificationStatus 
} from '../../interfaces/notification.interface';
import {
    NOTIFICATION_DISPLAY_CONFIG,
    NOTIFICATION_DISPLAY_DURATION,
} from '../../constants/notification.constants';

interface NotificationProps {
    notification: INotification;
    onClose: (id: string) => void;
    onClick?: (notification: INotification) => void;
    isAutoHide?: boolean;
    isPauseOnHover?: boolean;
}

const getNotificationIcon = (type: NotificationType, status: NotificationStatus): JSX.Element => {
    const config = NOTIFICATION_DISPLAY_CONFIG[type];
    return (
        <span 
            className="notification-icon material-icons"
            role="img"
            aria-label={config.accessibility.description}
        >
            {config.icon}
        </span>
    );
};

const getNotificationClassName = (
    type: NotificationType,
    priority: NotificationPriority,
    status: NotificationStatus
): string => {
    return classNames(
        'notification',
        `notification--${type.toLowerCase()}`,
        `notification--${priority.toLowerCase()}`,
        `notification--${status.toLowerCase()}`,
        {
            'notification--unread': status === NotificationStatus.UNREAD,
            'notification--interactive': Boolean(NOTIFICATION_DISPLAY_CONFIG[type].actionUrl)
        }
    );
};

const Notification: React.FC<NotificationProps> = ({
    notification,
    onClose,
    onClick,
    isAutoHide = true,
    isPauseOnHover = true
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const remainingTimeRef = useRef<number>();

    const startTimer = useCallback(() => {
        if (!isAutoHide) return;

        const duration = NOTIFICATION_DISPLAY_DURATION[notification.priority];
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            onClose(notification.id);
        }, remainingTimeRef.current || duration);

        remainingTimeRef.current = duration;
    }, [isAutoHide, notification.id, notification.priority, onClose]);

    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
    }, []);

    useEffect(() => {
        startTimer();
        return () => clearTimer();
    }, [startTimer, clearTimer]);

    const handleClose = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        setIsVisible(false);
        clearTimer();
        onClose(notification.id);
    }, [clearTimer, notification.id, onClose]);

    const handleClick = useCallback(() => {
        if (onClick) {
            onClick(notification);
        }
    }, [notification, onClick]);

    const handleMouseEnter = useCallback(() => {
        if (isPauseOnHover && isAutoHide) {
            clearTimer();
            setIsPaused(true);
        }
    }, [isPauseOnHover, isAutoHide, clearTimer]);

    const handleMouseLeave = useCallback(() => {
        if (isPauseOnHover && isAutoHide) {
            startTimer();
            setIsPaused(false);
        }
    }, [isPauseOnHover, isAutoHide, startTimer]);

    const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            handleClick();
        } else if (event.key === 'Escape') {
            handleClose(event as unknown as React.MouseEvent);
        }
    }, [handleClick, handleClose]);

    const config = NOTIFICATION_DISPLAY_CONFIG[notification.type];
    const className = getNotificationClassName(
        notification.type,
        notification.priority,
        notification.status
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={className}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={config.animation}
                    role={config.accessibility.role}
                    aria-live={config.accessibility.live}
                    aria-atomic="true"
                    tabIndex={0}
                    onClick={handleClick}
                    onKeyPress={handleKeyPress}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{ backgroundColor: config.color }}
                >
                    <div className="notification__content">
                        {getNotificationIcon(notification.type, notification.status)}
                        <div className="notification__text">
                            <h4 className="notification__title">{notification.title}</h4>
                            <p className="notification__message">{notification.message}</p>
                            <span className="notification__timestamp">
                                {new Date(notification.createdAt).toLocaleTimeString()}
                            </span>
                        </div>
                        <button
                            className="notification__close"
                            onClick={handleClose}
                            aria-label="Close notification"
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                    {isAutoHide && !isPaused && (
                        <motion.div
                            className="notification__progress"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{
                                duration: NOTIFICATION_DISPLAY_DURATION[notification.priority] / 1000,
                                ease: 'linear'
                            }}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Notification;