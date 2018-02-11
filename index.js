#!/usr/bin/env node
/*jshint esversion: 6 */
'use strict';

const program = require('commander');
const Realtime = require('leancloud-realtime').Realtime;
const TextMessage =
        require('leancloud-realtime').TextMessage;
const blessed = require('blessed');
const realtime = new Realtime({appId: 'MYH4fwAiOFx9sFkSSHyRaLNm-gzGzoHsz'});

function createUI() {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
  });

  const chatLog = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: screen.height -3,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  const chatInput = blessed.textbox({
    top: screen.height-3,
    left: 0,
    width: '100%',
    height: 3,
    inputOnFocus: true,
    tags: false,
    secret: false,
    censor: false,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  screen.append(chatLog);
  screen.append(chatInput);

  screen.key(['C-c'], function(ch, key) {
    return process.exit(0);
  });

  chatInput.key(['C-c'], function(ch, key) {
    return process.exit(0);
  });

  chatInput.focus();
  screen.render();

  function addLineToChatLog(line) {
    chatLog.insertBottom(line);
    chatLog.setScrollPerc(100);
    chatInput.focus();
    screen.render();
  }

  return { screen, chatInput, addLineToChatLog};
}

program.arguments('<room>')
  .option('-n, --nickname <nickname>', 'Public nickname')
  .action(room => {
    let nickname = "guest" + Math.round(Math.random()*100000);
    if (program.nickname) nickname = program.nickname;
    console.log('Entering %s as %s.', room, nickname);
    startChat(room, nickname);
  })
  .parse(process.argv);

function startChat(room, nickname) {
  realtime.createIMClient(nickname).then(self => {
    const ui = createUI();
    const query = self.getQuery();
    query.equalTo('name', room);
    query.find().then(conversations => {
      if (conversations.length > 0) {
        ui.addLineToChatLog('Room found. Joining.');
        return conversations[0].join();
      } else {
        ui.addLineToChatLog('Room not found, creating ...');
        return self.createConversation({
          members: [],
          name: room,
          transient: false,
          unique: false,
        });
      };
    }).then(conversation => {
      ui.addLineToChatLog('You are in room {bold}' + room + '{/bold}'
                          + ' as {bold}' + nickname + '{/bold}');
      ui.chatInput.key('enter', (ch, key) => {
        conversation.send(new TextMessage(ui.chatInput.getValue()))
          .then(message => {
            ui.chatInput.clearValue();
            ui.addLineToChatLog('{bold}' + message.from + '{/bold}: '
                                + message.text);
          }).catch(e => {
            ui.addLineToChatLog(e);
          });
      });

      self.on('message', function(message, inConversation) {
        if (conversation.id == inConversation.id) {
          ui.addLineToChatLog('{bold}' + message.from + '{/bold}: '
                                + message.text);
        }
      });
    }).catch(console.error.bind(console));
  }).catch(console.error.bind(console));
}
