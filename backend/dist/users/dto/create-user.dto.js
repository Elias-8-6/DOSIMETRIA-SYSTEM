"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserDto = void 0;
const class_validator_1 = require("class-validator");
const jwt_payload_interface_1 = require("../../common/interfaces/jwt-payload.interface");
class CreateUserDto {
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "El nombre completo es un campo requerido" }),
    (0, class_validator_1.IsString)({ message: "Debe ser un string" }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "El email completo es un campo requerido" }),
    (0, class_validator_1.IsString)({ message: "Debe ser un string" }),
    (0, class_validator_1.IsEmail)({}, { message: "Debe cumplir con el formato de correo" }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "La password es un campo requerido" }),
    (0, class_validator_1.IsString)({ message: "Debe ser un string" }),
    (0, class_validator_1.MinLength)(8, { message: "El campo debe contener mínimo 8 caracteres" }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)({ message: "El rol es un campo requerido" }),
    (0, class_validator_1.IsString)({ message: "Debe ser un string" }),
    (0, class_validator_1.IsEnum)(jwt_payload_interface_1.Role),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role_code", void 0);
//# sourceMappingURL=create-user.dto.js.map