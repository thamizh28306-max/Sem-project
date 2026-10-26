/**
 * Formats currency in Indian Rupee format (INR).
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount) || amount === 0) {
    return '₹0';
  }
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Formats distance with appropriate units.
 */
export function formatDistance(distanceMeters?: number, distanceKm?: number): string {
  if (distanceKm != null && !isNaN(distanceKm)) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }
  if (distanceMeters != null && !isNaN(distanceMeters)) {
    if (distanceMeters >= 1000) {
      return `${(distanceMeters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(distanceMeters)} m`;
  }
  return '—';
}
