# poll_discord_app

links

- https://dashboard.heroku.com/
- https://leovoel.github.io/embed-visualizer/
- https://discordjs.guide

git subtree push --prefix packages/others/poll_discord_app/ heroku main
<!-- 
git push heroku `git subtree split --prefix #{dir_name} main`:main --force -->

```
[remote "heroku"]
	url = https://git.heroku.com/poll-discord-app.git
	fetch = +refs/heads/*:refs/remotes/heroku/*
```


embed example

```json
{
  "content": "this `supports` __a__ **subset** *of* ~~markdown~~ 😃 ```js\nfunction foo(bar) {\n  console.log(bar);\n}\n\nfoo(1);```",
  "embed": {
    "title": "title ~~(did you know you can have markdown here too?)~~",
    "description": "this supports [named links](https://discordapp.com) on top of the previously shown subset of markdown. ```\nyes, even code blocks```",
    "url": "https://discordapp.com",
    "color": 12722015,
    "timestamp": "2021-03-16T08:55:22.442Z",
    "footer": {
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
      "text": "footer text"
    },
    "thumbnail": {
      "url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "image": {
      "url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "author": {
      "name": "author name",
      "url": "https://discordapp.com",
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    "fields": [
      {
        "name": "22:00-22:30",
        "value": "\t:o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb, @ccc"
      },

      {
        "name": "22:00-22:30",
        "value": "\t:o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb, @ccc"
      },
      {
        "name": "22:00-22:30",
        "value": "\t:o: :\t @aaa, @bbb, @ccc\n\t:question: :\t @aaa, @bbb, @ccc\n\t:x: :\t @aaa, @bbb, @ccc"
      }
    ]
  }
}
```
