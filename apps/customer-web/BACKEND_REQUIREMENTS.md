# Backend API Requirements for Customer Web

The customer-web application requires the following backend endpoints:

## Platform API

### GET /tenants/by-domain/:domain

Returns tenant information based on custom domain.

**Response:**
```json
{
  "slug": "tenant-a",
  "name": "Tenant A",
  "config": {
    "investmentContractAddress": "Txxxxx",
    "usdtTokenAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "branding": {
      "logo": "https://...",
      "primaryColor": "#FF6600"
    }
  }
}
```

**Implementation Status:** ❌ NOT IMPLEMENTED YET

This endpoint should be implemented in `apps/platform-api/src/modules/tenants/`.

## Tenant API

### POST /contracts/execute

Registers customer after wallet approval.

**Request:**
```json
{
  "walletAddress": "string",
  "approvedAmount": number,
  "approvalTxHash": "string",
  "referralCode": "string" (optional)
}
```

**Response:**
```json
{
  "success": boolean,
  "customerId": "string",
  "message": "string"
}
```

**Implementation Status:** ✅ LIKELY EXISTS (check tenant-api project)
