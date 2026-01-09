import { PartialType } from "@nestjs/swagger";
import { CreateSystemWalletDto } from "./create-system-wallet.dto";

export class UpdateSystemWalletDto extends PartialType(CreateSystemWalletDto) {}
