import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class QuerySurveyMetersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  only_valid?: string;
}
