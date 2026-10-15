import { bold, mono, italic } from '../../utils/text.js';

const games = new Map();

export default {
  name: 'tictactoe',
  aliases: ['ttt', 'xo'],
  category: 'fun',
  groupOnly: true,
  description: 'Tic-tac-toe game. Challenge a friend!',
  usage: '.tictactoe @user | .tictactoe <1-9> | .tictactoe end',
  async execute(ctx) {
    const arg = ctx.args[0] || '';
    const chatId = ctx.chatId;
    
    if (arg === 'end' || arg === 'stop') {
      if (games.has(chatId)) { games.delete(chatId); return ctx.replyOk('Game ended.'); }
      return ctx.reply('No active game.');
    }
    
    const mentions = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mentions.length > 0) {
      // Start new game
      if (games.has(chatId)) return ctx.reply('A game is already active. Type .tictactoe end first.');
      const p1 = ctx.sender;
      const p2 = mentions[0];
      games.set(chatId, { board: Array(9).fill(''), turn: p1, p1, p2, p1Sym: '❌', p2Sym: '⭕' });
      return ctx.sock.sendMessage(ctx.chatId, {
        text: `${bold('🎮 TIC-TAC-TOE')}\n\n${_render(games.get(chatId))}\n\n❌ ${mono('@' + p1.split('@')[0])} vs ⭕ ${mono('@' + p2.split('@')[0])}\n\n❌ goes first! Type .tictactoe <1-9>`,
        mentions: [p1, p2],
      });
    }
    
    // Make a move
    const game = games.get(chatId);
    if (!game) return ctx.reply(`No active game. Start one: ${mono('.tictactoe @opponent')}`);
    
    const pos = parseInt(arg) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) return ctx.reply('Type a number 1-9 for the position.');
    if (game.board[pos] !== '') return ctx.reply('That position is already taken.');
    if (ctx.sender !== game.turn) return ctx.reply(`It's not your turn. It's @${game.turn.split('@')[0]}'s turn.`);
    
    game.board[pos] = game.turn === game.p1 ? game.p1Sym : game.p2Sym;
    
    const winner = _checkWin(game);
    if (winner) {
      games.delete(chatId);
      return ctx.reply(`${_render(game)}\n\n🎉 ${winner === game.p1Sym ? '❌' : '⭕'} wins!`);
    }
    if (!game.board.includes('')) {
      games.delete(chatId);
      return ctx.reply(`${_render(game)}\n\n🤝 It's a draw!`);
    }
    
    game.turn = game.turn === game.p1 ? game.p2 : game.p1;
    const turnSym = game.turn === game.p1 ? game.p1Sym : game.p2Sym;
    return ctx.reply(`${_render(game)}\n\n${turnSym}'s turn: @${game.turn.split('@')[0]}`);
  },
};

function _render(game) {
  const b = game.board;
  const sym = c => c === '' ? '➖' : c;
  return `${sym(b[0])}${sym(b[1])}${sym(b[2])}\n${sym(b[3])}${sym(b[4])}${sym(b[5])}\n${sym(b[6])}${sym(b[7])}${sym(b[8])}`;
}
function _checkWin(g) {
  const b = g.board;
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b2,c] of lines) {
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a];
  }
  return null;
}
