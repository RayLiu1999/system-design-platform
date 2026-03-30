// Redis 模擬器 — 資料結構 + 指令互動
import { useState, useCallback, useRef } from 'react'
import TabGroup from '../../components/TabGroup'
import './RedisSimulator.css'

const TABS = [
  { id: 'string', label: 'String' },
  { id: 'hash', label: 'Hash' },
  { id: 'list', label: 'List' },
  { id: 'set', label: 'Set' },
  { id: 'zset', label: 'Sorted Set' },
]

/**
 * Redis 模擬器
 * 互動式操作五種核心資料結構
 */
export default function RedisSimulator({ onInteract }) {
  const [dataType, setDataType] = useState('string')
  // 模擬 Redis 記憶體
  const [store, setStore] = useState({
    strings: {},
    hashes: {},
    lists: {},
    sets: {},
    zsets: {},
  })
  const [commandInput, setCommandInput] = useState('')
  const [output, setOutput] = useState([])
  const [logs, setLogs] = useState([])
  const logIdRef = useRef(0)
  const hasInteracted = useRef(false)

  const triggerInteract = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const addOutput = useCallback((type, msg) => {
    logIdRef.current++
    setOutput(prev => [...prev, { id: logIdRef.current, type, message: msg }].slice(-15))
  }, [])

  const addLog = useCallback((type, msg) => {
    logIdRef.current++
    setLogs(prev => [{ id: logIdRef.current, type, message: msg }, ...prev].slice(0, 10))
  }, [])

  // 執行快捷指令
  const executeQuickCommand = useCallback((cmd) => {
    triggerInteract()
    const parts = cmd.split(' ')
    const op = parts[0].toUpperCase()

    addOutput('info', `> ${cmd}`)

    switch (op) {
      case 'SET': {
        const key = parts[1]
        const val = parts.slice(2).join(' ')
        setStore(prev => ({ ...prev, strings: { ...prev.strings, [key]: val } }))
        addOutput('success', 'OK')
        addLog('success', `SET ${key} = "${val}"`)
        break
      }
      case 'GET': {
        const key = parts[1]
        const val = store.strings[key]
        addOutput(val ? 'success' : 'warning', val || '(nil)')
        addLog('info', `GET ${key} → ${val || '(nil)'}`)
        break
      }
      case 'HSET': {
        const key = parts[1]
        const field = parts[2]
        const val = parts.slice(3).join(' ')
        setStore(prev => ({
          ...prev,
          hashes: { ...prev.hashes, [key]: { ...(prev.hashes[key] || {}), [field]: val } },
        }))
        addOutput('success', '(integer) 1')
        addLog('success', `HSET ${key} ${field} = "${val}"`)
        break
      }
      case 'HGETALL': {
        const key = parts[1]
        const hash = store.hashes[key]
        if (hash) {
          Object.entries(hash).forEach(([f, v]) => {
            addOutput('info', `  ${f}: ${v}`)
          })
        } else {
          addOutput('warning', '(empty hash)')
        }
        addLog('info', `HGETALL ${key}`)
        break
      }
      case 'LPUSH': {
        const key = parts[1]
        const vals = parts.slice(2)
        setStore(prev => ({
          ...prev,
          lists: { ...prev.lists, [key]: [...vals.reverse(), ...(prev.lists[key] || [])] },
        }))
        addOutput('success', `(integer) ${(store.lists[parts[1]] || []).length + vals.length}`)
        addLog('success', `LPUSH ${key} ${vals.join(' ')}`)
        break
      }
      case 'LRANGE': {
        const key = parts[1]
        const list = store.lists[key] || []
        if (list.length > 0) {
          list.forEach((v, i) => addOutput('info', `  ${i}) "${v}"`))
        } else {
          addOutput('warning', '(empty list)')
        }
        addLog('info', `LRANGE ${key} 0 -1`)
        break
      }
      case 'SADD': {
        const key = parts[1]
        const members = parts.slice(2)
        setStore(prev => ({
          ...prev,
          sets: { ...prev.sets, [key]: new Set([...(prev.sets[key] || []), ...members]) },
        }))
        addOutput('success', `(integer) ${members.length}`)
        addLog('success', `SADD ${key} ${members.join(' ')}`)
        break
      }
      case 'SMEMBERS': {
        const key = parts[1]
        const set = store.sets[key]
        if (set && set.size > 0) {
          [...set].forEach((v, i) => addOutput('info', `  ${i}) "${v}"`))
        } else {
          addOutput('warning', '(empty set)')
        }
        addLog('info', `SMEMBERS ${key}`)
        break
      }
      case 'ZADD': {
        const key = parts[1]
        const score = parseFloat(parts[2])
        const member = parts[3]
        setStore(prev => ({
          ...prev,
          zsets: {
            ...prev.zsets,
            [key]: [...(prev.zsets[key] || []).filter(z => z.member !== member), { score, member }]
              .sort((a, b) => a.score - b.score),
          },
        }))
        addOutput('success', '(integer) 1')
        addLog('success', `ZADD ${key} ${score} ${member}`)
        break
      }
      case 'ZRANGE': {
        const key = parts[1]
        const zset = store.zsets[key] || []
        if (zset.length > 0) {
          zset.forEach((z, i) => addOutput('info', `  ${i}) "${z.member}" (score: ${z.score})`))
        } else {
          addOutput('warning', '(empty sorted set)')
        }
        addLog('info', `ZRANGE ${key} 0 -1 WITHSCORES`)
        break
      }
      default:
        addOutput('error', `(error) ERR unknown command '${op}'`)
    }
  }, [store, triggerInteract, addOutput, addLog])

  // 預設的快捷指令
  const quickCommands = {
    string: [
      'SET user:1001 Alice',
      'SET user:1002 Bob',
      'GET user:1001',
    ],
    hash: [
      'HSET user:1001 name Alice',
      'HSET user:1001 age 30',
      'HSET user:1001 city Taipei',
      'HGETALL user:1001',
    ],
    list: [
      'LPUSH queue task_1',
      'LPUSH queue task_2',
      'LPUSH queue task_3',
      'LRANGE queue 0 -1',
    ],
    set: [
      'SADD tags:post1 redis nosql cache',
      'SMEMBERS tags:post1',
    ],
    zset: [
      'ZADD leaderboard 100 Alice',
      'ZADD leaderboard 250 Bob',
      'ZADD leaderboard 180 Charlie',
      'ZRANGE leaderboard 0 -1',
    ],
  }

  const handleSubmit = useCallback(() => {
    if (commandInput.trim()) {
      executeQuickCommand(commandInput.trim())
      setCommandInput('')
    }
  }, [commandInput, executeQuickCommand])

  const handleReset = useCallback(() => {
    setStore({ strings: {}, hashes: {}, lists: {}, sets: {}, zsets: {} })
    setOutput([])
    setLogs([])
  }, [])

  return (
    <div className="simulator-container redis-sim" id="redis-simulator">
      <div className="simulator-title">
        <span className="icon">⚡</span>
        Redis 模擬器
      </div>

      <TabGroup tabs={TABS} defaultTab="string" onChange={(t) => { setDataType(t); setOutput([]) }} />

      <div className="redis-desc">
        Redis 是記憶體資料結構伺服器，支援 String / Hash / List / Set / Sorted Set 五種核心類型。
        所有操作皆為 O(1) 或 O(log n)，延遲 &lt; 1ms。
      </div>

      {/* 快捷指令 */}
      <div className="redis-quick-cmds">
        {(quickCommands[dataType] || []).map((cmd, i) => (
          <button key={i} className="redis-cmd-btn" onClick={() => executeQuickCommand(cmd)}>
            {cmd}
          </button>
        ))}
      </div>

      {/* 自由輸入 */}
      <div className="redis-input-row">
        <span className="redis-prompt">redis&gt;</span>
        <input
          className="redis-input"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="輸入 Redis 指令..."
          id="redis-command-input"
        />
        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>執行</button>
        <button className="btn btn-ghost btn-sm" onClick={handleReset}>清除</button>
      </div>

      {/* 輸出 */}
      {output.length > 0 && (
        <div className="redis-output" id="redis-output">
          {output.map(o => (
            <div key={o.id} className={`redis-output-line ${o.type}`}>{o.message}</div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="sim-log" id="redis-log">
          {logs.map(log => (
            <div key={log.id} className={`sim-log-line ${log.type}`}>{log.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
