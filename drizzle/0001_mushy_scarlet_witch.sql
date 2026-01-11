CREATE TABLE `agent_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentName` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL,
	`itemsProcessed` int NOT NULL DEFAULT 0,
	`itemsFailed` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`executionTime` int,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`content` text,
	`url` varchar(1000) NOT NULL,
	`imageUrl` varchar(1000),
	`source` varchar(200) NOT NULL,
	`category` varchar(100),
	`relevanceScore` decimal(3,2),
	`isSaved` boolean NOT NULL DEFAULT false,
	`isRead` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`summary` text NOT NULL,
	`topArticleIds` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `information_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceType` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `information_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investment_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` varchar(50) NOT NULL,
	`signal` varchar(50) NOT NULL,
	`reason` text NOT NULL,
	`targetPrice` decimal(18,8),
	`stopLoss` decimal(18,8),
	`riskLevel` varchar(20),
	`confidence` decimal(3,2),
	`isActioned` boolean NOT NULL DEFAULT false,
	`actionedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investment_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`explanation` text,
	`caseStudy` text,
	`keyPoints` json,
	`resources` json,
	`nextTopic` varchar(255),
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` varchar(50) NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`entryPrice` decimal(18,8) NOT NULL,
	`currentPrice` decimal(18,8),
	`totalValue` decimal(18,8),
	`gainLoss` decimal(18,8),
	`gainLossPercent` decimal(5,2),
	`purchasedAt` timestamp,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quantitative_strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`strategyType` varchar(100) NOT NULL,
	`parameters` json,
	`backtestResults` json,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quantitative_strategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageType` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trade_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`assetType` varchar(50) NOT NULL,
	`tradeType` varchar(20) NOT NULL,
	`quantity` decimal(18,8) NOT NULL,
	`price` decimal(18,8) NOT NULL,
	`totalAmount` decimal(18,8) NOT NULL,
	`reason` text,
	`signalId` int,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trade_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`interests` json,
	`notificationEmail` varchar(320),
	`notificationEnabled` boolean NOT NULL DEFAULT true,
	`summaryTime` varchar(5),
	`learningTime` varchar(5),
	`investmentCheckTime` varchar(5),
	`timezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`theme` varchar(20) NOT NULL DEFAULT 'light',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
