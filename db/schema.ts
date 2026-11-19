import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const appDocuments=sqliteTable('app_documents',{id:text('id').primaryKey(),body:text('body').notNull(),revision:integer('revision').notNull().default(0)});
export const appUsers=sqliteTable('app_users',{email:text('email').primaryKey(),role:text('role').notNull(),department:text('department').notNull().default('')});
export const backups=sqliteTable('backups',{id:text('id').primaryKey(),body:text('body').notNull(),created:text('created').notNull(),status:text('status').notNull().default('pending'),message:text('message').notNull().default(''),driveUrl:text('drive_url').notNull().default('')});
export const appConfig=sqliteTable('app_config',{id:text('id').primaryKey(),value:text('value').notNull()});

export const authSessions=sqliteTable('auth_sessions',{id:text('id').primaryKey(),email:text('email').notNull(),role:text('role').notNull(),name:text('name').notNull(),studentId:text('student_id').notNull(),expires:integer('expires').notNull()});
export const authChallenges=sqliteTable('auth_challenges',{id:text('id').primaryKey(),email:text('email').notNull(),codeHash:text('code_hash').notNull(),name:text('name').notNull(),studentId:text('student_id').notNull(),expires:integer('expires').notNull(),attempts:integer('attempts').notNull().default(0),created:integer('created').notNull()});
export const authLimits=sqliteTable('auth_limits',{id:text('id').primaryKey(),hits:integer('hits').notNull().default(0)});
export const careApplications=sqliteTable('care_applications',{id:text('id').primaryKey(),userId:text('user_id').notNull(),body:text('body').notNull(),created:text('created').notNull()});
