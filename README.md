# poll_discord_app

## usage

### Rich Poll

```
/rp "test"
"15:00-16:00"
"16:00-17:00"
"17:00-18:00"
"18:00-19:00"
"19:00-20:00"
"20:00-21:00"
"21:00-21:30"
"21:30-22:00"
"22:00-22:30"
"22:30-23:00"
"23:00-23:30"
"23:30-24:00"
"24:00-24:30"
```

(Use `/rpdev` instead of`/rp` in the development environment)

### Grouping

```
/gp 2
"Alice"
"Bob"
"Carol"
"Dave"
"Ellen"
"Frank"
```

(Use `/gpdev` instead of`/gp` in the development environment)

result

```
1. "Alice" "Dave" "Frank"
2. "Bob" "Carol" "Ellen"
```

### Rand

```
/rand 3
```

result

```
2
```

## start develop environment

- setup PostgreSQL
- `sudo /etc/init.d/postgresql start`
- `yarn start:dev`
