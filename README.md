# poll_discord_app

## usage

### Rich Poll

```txt
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

(Use `/rpdev` instead of `/rp` in the development environment)

#### Shorthand

```txt
/rp30 "test" "15" "25"
```

or

```txt
/rp60 "test" "15" "25"
```

(Use `/rp30dev` , `/rp60dev` instead of `/rp30` , `/rp60` respectively in the development environment)

### Grouping

```txt
/gp 2
"Alice"
"Bob"
"Carol"
"Dave"
"Ellen"
"Frank"
```

(Use `/gpdev` instead of `/gp` in the development environment)

result

```txt
1. "Alice" "Dave" "Frank"
2. "Bob" "Carol" "Ellen"
```

### Rand

```txt
/rand 3
```

result

```txt
2
```

## start develop environment

- setup PostgreSQL
- `sudo /etc/init.d/postgresql start`
- `yarn start:dev`
