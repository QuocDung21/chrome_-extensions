# Syncfusion DocumentEditor Service Setup

## Overview
The template-filler feature requires a Syncfusion DocumentEditor service to convert DOCX files to SFDT format for rendering in the browser. This document explains how to set up your own service for reliable production use.

## Current Issue
The public Syncfusion services may be unreliable or unavailable:
```
❌ https://services.syncfusion.com/react/production/api/documenteditor/Import
❌ Failed to load resource: the server responded with a status of 404
```

## Solution: Local Syncfusion Service

### Step 1: Download Syncfusion DocumentEditor Web Services
1. Visit: https://github.com/SyncfusionExamples/EJ2-DocumentEditor-WebServices
2. Clone the repository:
   ```bash
   git clone https://github.com/SyncfusionExamples/EJ2-DocumentEditor-WebServices.git
   cd EJ2-DocumentEditor-WebServices
   ```

### Step 2: Choose Your Implementation
The repository contains multiple implementations:

#### Option A: ASP.NET Core (Recommended)
```bash
cd ASP.NET Core/DocumentEditorWebService
dotnet run
```
Service will be available at: `http://localhost:5000/api/documenteditor/`

#### Option B: Node.js
```bash
cd NodeJS/DocumentEditorWebService
npm install
npm start
```
Service will be available at: `http://localhost:6002/api/documenteditor/`

#### Option C: Java Spring Boot
```bash
cd Java/DocumentEditorWebService
mvn spring-boot:run
```
Service will be available at: `http://localhost:8080/api/documenteditor/`

### Step 3: Configure Environment Variable
Set the environment variable to point to your local service:

#### For Development (.env file)
```env
REACT_SYNCFUSION_SERVICE_URL=http://localhost:5000/api/documenteditor/
```

#### For Production (Docker/Server)
```bash
export REACT_SYNCFUSION_SERVICE_URL=http://your-server:5000/api/documenteditor/
```

### Step 4: Test the Service
1. Start your chosen service implementation
2. Test the Import endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/documenteditor/Import \
     -F "files=@sample.docx"
   ```
3. Should return SFDT JSON format

## Current Fallback Mechanism

The application now tries multiple service URLs automatically:
1. Your configured `REACT_SYNCFUSION_SERVICE_URL`
2. `https://services.syncfusion.com/js/production/api/documenteditor/`
3. `https://ej2services.syncfusion.com/production/web-services/api/documenteditor/`

## Error Messages

The application provides detailed error messages for different scenarios:

### Service Not Available (404)
```
Tất cả dịch vụ Syncfusion đều không khả dụng (404).

Vui lòng:
1. Liên hệ quản trị viên để cập nhật service URL
2. Kiểm tra kết nối internet  
3. Thiết lập local Syncfusion service
```

### Network/CORS Issues
```
Không thể kết nối tới bất kỳ dịch vụ Syncfusion nào do chính sách CORS.

Vui lòng liên hệ quản trị viên để:
1. Cấu hình CORS headers
2. Thiết lập local Syncfusion service
3. Sử dụng proxy server
```

### Timeout Issues
```
Tất cả dịch vụ Syncfusion không phản hồi. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.
```

## Production Recommendations

1. **Use Local Service**: Set up your own Syncfusion service for reliability
2. **Load Balancing**: Deploy multiple instances behind a load balancer
3. **Health Monitoring**: Monitor service health and availability
4. **Backup Services**: Configure multiple service URLs as fallbacks
5. **CORS Configuration**: Properly configure CORS headers for your domain

## Troubleshooting

### Service Returns 404
- Verify the service is running
- Check the service URL path (should end with `/api/documenteditor/`)
- Ensure the Import endpoint exists

### CORS Errors  
- Add your domain to allowed origins in service configuration
- Consider using a proxy server if direct access is blocked

### Timeout Issues
- Increase service timeout settings
- Check network connectivity between client and service
- Verify service performance under load

## Support

For issues related to:
- **Syncfusion Service**: Check official Syncfusion documentation
- **Application Integration**: Contact the development team
- **Deployment**: Consult your DevOps team
