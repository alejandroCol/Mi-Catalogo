/** Tipos del listado geo OnePay (KYB crear empresa). Ver docs.onepay.la/client/companies/list-cities */

export type OnepayGeoState = { id: number; name: string }

export type OnepayGeoCity = {
  id: number
  name: string
  state: OnepayGeoState
}

export type OnepayCitiesPage = {
  cities: OnepayGeoCity[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export function formatOnepayCityLabel(city: OnepayGeoCity): string {
  return `${city.name}, ${city.state.name}`
}
