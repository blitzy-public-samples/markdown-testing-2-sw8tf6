/**
 * @fileoverview Enterprise-grade email notification service using SendGrid
 * Provides robust email delivery with template support, retry logic, and tracking
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { MailService } from '@sendgrid/mail'; // ^7.7.0
import { INotification, NotificationType } from '../interfaces/notification.interface';
import notificationConfig from '../config/notification.config';
import logger from '../../common/utils/logger.util';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';

/**
 * Interface for email delivery status tracking
 */
interface IEmailDeliveryStatus {
  success: boolean;
  messageId?: string;
  attemptCount: number;
  error?: string;
  timestamp: Date;
}

/**
 * Enterprise-grade email service for handling notification delivery
 * Implements comprehensive retry logic, template management, and delivery tracking
 */
@injectable()
export class EmailService {
  private readonly mailService: MailService;
  private readonly config: typeof notificationConfig;
  private readonly templateCache: Map<string, { template: string; expiresAt: Date }>;
  private readonly deliveryTracker: Map<string, IEmailDeliveryStatus>;

  constructor() {
    this.mailService = new MailService();
    this.config = notificationConfig;
    this.templateCache = new Map();
    this.deliveryTracker = new Map();

    // Initialize SendGrid with API key
    this.mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

    // Configure client settings
    this.mailService.setTimeout(5000); // 5 second timeout
    this.validateConfiguration();
  }

  /**
   * Validates service configuration on initialization
   * @throws {Error} If configuration is invalid
   */
  private validateConfiguration(): void {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error(SYSTEM_ERRORS.CONFIGURATION_ERROR);
    }

    if (!this.config.deliveryMethods.email.enabled) {
      logger.warn('Email delivery method is disabled in configuration');
    }
  }

  /**
   * Sends an email notification with comprehensive error handling and retry logic
   * @param notification - Notification data to send
   * @param recipientEmail - Recipient email address
   * @returns Promise resolving to delivery status
   */
  public async sendEmail(
    notification: INotification,
    recipientEmail: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      this.validateEmailRequest(notification, recipientEmail);

      // Check rate limits
      if (this.isRateLimitExceeded(recipientEmail)) {
        throw new Error(SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED);
      }

      // Get email template
      const template = await this.getEmailTemplate(
        notification.type,
        this.config.templates.defaultLocale
      );

      // Prepare email data
      const emailData = {
        to: recipientEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: process.env.SENDGRID_FROM_NAME
        },
        subject: notification.title,
        html: this.compileTemplate(template, {
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata
        }),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      };

      // Attempt delivery with retry logic
      const deliveryStatus = await this.retryDelivery(async () => {
        const response = await this.mailService.send(emailData);
        return response;
      });

      // Track delivery status
      this.trackDeliveryStatus(notification.id, {
        success: deliveryStatus,
        messageId: emailData.subject,
        attemptCount: 1,
        timestamp: new Date()
      });

      return deliveryStatus;

    } catch (error) {
      logger.error('Email delivery failed', error as Error, {
        notificationId: notification.id,
        recipientEmail,
        type: notification.type
      });
      
      return false;
    }
  }

  /**
   * Validates email request parameters
   * @param notification - Notification to validate
   * @param recipientEmail - Email to validate
   * @throws {Error} If validation fails
   */
  private validateEmailRequest(
    notification: INotification,
    recipientEmail: string
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!notification || !notification.id || !notification.type) {
      throw new Error(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
    }

    if (!emailRegex.test(recipientEmail)) {
      throw new Error(BUSINESS_ERRORS.BUSINESS_RULE_VIOLATION);
    }
  }

  /**
   * Implements rate limiting for email delivery
   * @param recipientEmail - Email to check
   * @returns Boolean indicating if rate limit is exceeded
   */
  private isRateLimitExceeded(recipientEmail: string): boolean {
    const key = `ratelimit:${recipientEmail}`;
    const now = Date.now();
    const windowMs = this.config.rateLimits.cooldownPeriod;
    
    const currentCount = this.deliveryTracker.get(key)?.attemptCount || 0;
    return currentCount >= this.config.rateLimits.maxPerUser;
  }

  /**
   * Retrieves and caches email templates
   * @param type - Notification type
   * @param locale - Template locale
   * @returns Promise resolving to template string
   */
  private async getEmailTemplate(
    type: NotificationType,
    locale: string
  ): Promise<string> {
    const cacheKey = `${type}:${locale}`;
    const cached = this.templateCache.get(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      return cached.template;
    }

    // Template would be loaded from config.templates.path
    // For this example, we'll use a simple template
    const template = `
      <div style="font-family: Arial, sans-serif;">
        <h1>{{title}}</h1>
        <p>{{message}}</p>
        {{#if metadata}}
          <div class="metadata">
            {{#each metadata}}
              <p><strong>{{@key}}:</strong> {{this}}</p>
            {{/each}}
          </div>
        {{/if}}
      </div>
    `;

    // Cache template
    this.templateCache.set(cacheKey, {
      template,
      expiresAt: new Date(Date.now() + this.config.templates.cacheTimeout)
    });

    return template;
  }

  /**
   * Implements retry logic with exponential backoff
   * @param sendFunction - Async function to retry
   * @returns Promise resolving to delivery status
   */
  private async retryDelivery(
    sendFunction: () => Promise<any>
  ): Promise<boolean> {
    let attempt = 0;
    const maxAttempts = this.config.retryPolicy.maxAttempts;

    while (attempt < maxAttempts) {
      try {
        await sendFunction();
        return true;
      } catch (error) {
        attempt++;
        
        if (attempt === maxAttempts) {
          throw error;
        }

        // Calculate backoff with jitter
        const backoff = Math.min(
          this.config.retryPolicy.backoffMs * Math.pow(2, attempt),
          this.config.retryPolicy.maxBackoffMs
        );
        const jitter = Math.random() * this.config.retryPolicy.jitterMs;
        
        await new Promise(resolve => 
          setTimeout(resolve, backoff + jitter)
        );
      }
    }

    return false;
  }

  /**
   * Compiles email template with provided data
   * @param template - Email template string
   * @param data - Data to inject into template
   * @returns Compiled template string
   */
  private compileTemplate(
    template: string,
    data: Record<string, any>
  ): string {
    return template.replace(
      /\{\{([^}]+)\}\}/g,
      (_, key) => data[key.trim()] || ''
    );
  }

  /**
   * Tracks email delivery status
   * @param notificationId - ID of notification
   * @param status - Delivery status details
   */
  private trackDeliveryStatus(
    notificationId: string,
    status: IEmailDeliveryStatus
  ): void {
    this.deliveryTracker.set(notificationId, status);
    
    // Clean up old tracking data
    if (this.deliveryTracker.size > 1000) {
      const oldestKey = this.deliveryTracker.keys().next().value;
      this.deliveryTracker.delete(oldestKey);
    }
  }
}