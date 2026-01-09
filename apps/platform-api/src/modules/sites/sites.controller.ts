import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SitesService } from "./sites.service";
import { SiteListQueryDto } from "./dto/site-list-query.dto";
import { SiteListResponseDto } from "./dto/site-list-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("站點列表")
@Controller("sites")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: "獲取站點列表（包含統計數據）" })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: SiteListResponseDto,
  })
  async getSiteList(
    @Query() query: SiteListQueryDto
  ): Promise<SiteListResponseDto> {
    return this.sitesService.getSiteList(query);
  }
}
