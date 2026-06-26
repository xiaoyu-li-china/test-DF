import { useSearchParams } from 'react-router-dom'

export function useWarehouseFilter() {
  const [searchParams] = useSearchParams()
  const warehouse = searchParams.get('warehouse') ?? ''
  return warehouse
}
