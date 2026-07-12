'use client'

import { Input } from '@/components/ui/input'

// 날짜와 시간을 분리한 입력.
// Safari는 <input type="datetime-local">의 시간 UI를 제대로 렌더하지 않는 경우가 있어,
// 모든 브라우저에서 안정적인 type="date" + type="time" 두 입력으로 나눈다.
// 값은 기존과 동일한 "YYYY-MM-DDTHH:mm"(datetime-local) 문자열로 주고받는다.

interface Props {
  id?: string
  value: string // "YYYY-MM-DDTHH:mm" (빈 문자열 허용)
  onChange: (value: string) => void
  minDate?: string // "YYYY-MM-DD"
}

function splitValue(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

function combine(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '00:00'}`
}

export default function DateTimeInput({ id, value, onChange, minDate }: Props) {
  const { date, time } = splitValue(value)

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => onChange(combine(e.target.value, time))}
        className="h-10 flex-1"
      />
      <Input
        type="time"
        value={time}
        onChange={(e) => onChange(combine(date, e.target.value))}
        className="h-10 w-32"
      />
    </div>
  )
}
