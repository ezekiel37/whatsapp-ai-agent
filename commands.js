import { sendMessage } from './whatsapp.js';
import { clearMemory, getMemory } from './memory.js';
import { logger } from './utils/logger.js';

// Available commands
const commands = {
    ping: {
        description: 'Check if the bot is alive',
        handler: handlePing,
    },
    help: {
        description: 'Show available commands',
        handler: handleHelp,
    },
    clear: {
        description: 'Clear conversation history',
        handler: handleClear,
    },
    status: {
        description: 'Show bot status',
        handler: handleStatus,
    },
};

/**
 * Handle incoming command
 */
export async function handleCommand(message, content) {
    try {
        const args = content.split(' ');
        const command = args[0].slice(1).toLowerCase(); // Remove '/' and lowercase

        if (commands[command]) {
            logger.info(`Executing command: ${command}`);
            await commands[command].handler(message);
        } else {
            await sendMessage(
                message.from,
                `❌ Unknown command: ${command}\nUse /help for available commands`
            );
        }
    } catch (error) {
        logger.error('Error handling command:', error.message);
        await sendMessage(message.from, '❌ Error executing command');
    }
}

/**
 * /ping command
 */
async function handlePing(message) {
    await sendMessage(message.from, '🏓 Pong!');
}

/**
 * /help command
 */
async function handleHelp(message) {
    let helpText = '📖 Available Commands:\n\n';
    Object.entries(commands).forEach(([cmd, details]) => {
        helpText += `/${cmd} - ${details.description}\n`;
    });
    helpText += '\n💬 Just send a message for AI responses!';
    await sendMessage(message.from, helpText);
}

/**
 * /clear command
 */
async function handleClear(message) {
    clearMemory(message.from);
    await sendMessage(
        message.from,
        '🗑️ Conversation history cleared!'
    );
}

/**
 * /status command
 */
async function handleStatus(message) {
    const history = getMemory(message.from);
    const statusText = `📊 Bot Status:\n✅ Online\n💾 Messages in history: ${history.length}`;
    await sendMessage(message.from, statusText);
}