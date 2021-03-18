# memo

## ローカルの PostgreSQL を起動

```sh
$  sudo apt-get install postgresql

Success. You can now start the database server using:

    /usr/lib/postgresql/10/bin/pg_ctl -D /var/lib/postgresql/10/main -l logfile start

Ver Cluster Port Status Owner    Data directory              Log file
10  main    5432 down   postgres /var/lib/postgresql/10/main /var/log/postgresql/postgresql-10-main.log
update-alternatives: using /usr/share/postgresql/10/man/man1/postmaster.1.gz to provide /usr/share/man/man1/postmaster.1.gz (postmaster.1.gz) in auto mode
invoke-rc.d: could not determine current runlevel
Setting up postgresql (10+190ubuntu0.1) ...
Processing triggers for man-db (2.8.3-2ubuntu0.1) ...
Processing triggers for ureadahead (0.100.0-21) ...
Processing triggers for libc-bin (2.27-3ubuntu1.2) ...
Processing triggers for systemd (237-3ubuntu10.42) ...


$  which psql

$  sudo /etc/init.d/postgresql start
$  /etc/init.d/postgresql --help
Usage: /etc/init.d/postgresql {start|stop|restart|reload|force-reload|status} [version ..]

$  sudo passwd postgres
$  su postgres
$  createdb richpoll
$  psql richpoll
$  psql  --dbname richpoll --host localhost --port 5432  --username noshiro


```

## psql

```sh

$  SELECT * FROM pg_settings WHERE name = 'port';
$  127.0.0.1
$  sudo netstat -plunt | grep postgres
```

## sql メモ

```sql
create table main ( data JSON , timestamp timestamp );
insert into main ( data, timestamp, id ) values ( '{ "aaa": "bbb" }', current_timestamp, '2021-03-20 v2' );
update main SET data = '{ "eee": "fff" }',  timestamp = current_timestamp where id = '2021-03-20';
```

```sh
export DATABASE_URL=postgres://$(whoami)

heroku pg:info

# npm config set strict-ssl=false
```

<!--

memo

git subtree push --prefix packages/others/poll_discord_app/ heroku main

git push heroku `git subtree split --prefix #{dir_name} main`:main --force

```
[remote "heroku"]
  url = https://git.heroku.com/poll-discord-app.git
  fetch = +refs/heads/*:refs/remotes/heroku/*
```

-->

links

- https://dashboard.heroku.com/
- https://leovoel.github.io/embed-visualizer/
- https://discordjs.guide
- https://discord.com/developers
- https://devcenter.heroku.com/ja/articles/heroku-postgresql
- ログインできない問題
  - https://qiita.com/tomlla/items/9fa2feab1b9bd8749584
  - https://www.postgresql.jp/document/8.2/html/libpq-envars.html
    - PGDATABASE, PGPORT, PGUSER を指定すれば解決した
- https://node-postgres.com/
- https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
- https://qiita.com/izmktr/items/60aa015915af0e293103
