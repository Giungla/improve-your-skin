
export interface ILoginUser {
  email: string;
  password: string;
}

export interface ILoginUserPayload {
  authToken: string;
}

export interface IResetPasswordSuccessResponse {
  success: true;
  message: string;
}

export interface ICookieOptions {
  path?: string;
  expires?: Date;
  domain?: string;
  secure?: boolean;
  sameSite?: boolean;
  httpOnly?: boolean;
}

export interface ISplitCookieObject {
  name: string;
  value: string;
}






export interface ISignUpParam {
  name: string;
  email: string;
  /**
   * @description Aceito receber novidades via SMS e e-mail
   */
  optin: boolean;
  /**
   * @description Aceito os termos e condições do site
   */
  consent: boolean;
  password: string;
}

export interface ISignInErrorResponse {
  error: true;
  data: {
    code: string;
    message: string;
    payload: {
      reason:
        | 'ACCOUNT_EXISTS'
        | 'ACCOUNT_NOT_EXISTS'
        | 'ACCOUNT_NOT_ACTIVE'
        | 'INVALID_CREDENTIALS'
        | 'COULD_NOT_CREATE_MAGIC_LINK'
        | 'MISSING_MAGIC_TOKEN'
        | 'INVALID_MAGIC_TOKEN'
        | 'EXPIRED_MAGIC_TOKEN'
        | 'USED_MAGIC_TOKEN';
    };
    traceId: string;
  };
}

export interface ISignInSuccessResponse<T = null> {
  data: T;
  error: false;
}

export type ISignInResponse<T> =
  | ISignInErrorResponse
  | ISignInSuccessResponse<T>;

export type IFieldValidationResponse = [boolean, string];

export type IScrollIntoViewArgs =
  | boolean
  | ScrollIntoViewOptions;






// user-area

export interface ICurrentUserData {
  id: number;
  cpf: string;
  name: string;
  email: string;
  birthday: string;
  telephone: string;
}

export interface IQueryPattern <T = null> {
  fetched: boolean;
  pending: boolean;
  data: T;
}

export type IGetUserResponse =
  | {
    error: true;
    data: null;
  }
  | {
    error: false;
    data: ICurrentUserData;
  };



// user address

export type IStateAcronym =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MS'
  | 'MT'
  | 'MG'
  | 'PA'
  | 'PB'
  | 'PR'
  | 'PE'
  | 'PI'
  | 'RJ'
  | 'RN'
  | 'RS'
  | 'RO'
  | 'RR'
  | 'SC'
  | 'SP'
  | 'SE'
  | 'TO';

export interface IViaCEPPayload {
  uf: IStateAcronym;
  cep: string;
  ddd: string;
  gia: string;
  ibge: string;
  siafi: string;
  bairro: string;
  unidade: string;
  localidade: string;
  logradouro: string;
  complemento: string;
}

export interface IAddress {
  /**
   * ID do endereço cadastrado no banco
   */
  id: string;
  /**
   * O nome da rua informado pelo usuário
   */
  address: string;
  /**
   * O CEP do endereço informado no padrão "00000-000"
   */
  cep: string;
  /**
   * A cidade informada para este endereço
   */
  city: string;
  /**
   * Complemento do endereço do cliente, o campo é opcional no frontend
   */
  complement: string;
  /**
   * O bairro deste endereço
   */
  neighborhood: string;
  /**
   * Um nome ou descrição do endereço informado pelo usuário para que este possa ser identificado rapidamente
   */
  nick: string;
  /**
   * Número da cada/APTO
   */
  number: string;
  /**
   * será sempre composto por 2 caracteres, retornara qualquer uma das 26 siglas dos estados brasileiros eg.: PE, SP, RJ
   */
  state: IStateAcronym;
}

export interface IResponseError {
  data: null;
  error: true;
}

export interface IResponseSuccess <T = null> {
  data: T;
  error: false;
}

export type ISearchAddressResponse =
  | IResponseError
  | IResponseSuccess<IAddress[]>;

export type IDeleteAddressResponse =
  | IResponseError
  | IResponseSuccess<IAddress[]>;

export type IGetAddressDetails =
  | IResponseError
  | IResponseSuccess<IViaCEPPayload>;



// reset passwords

export interface IPasswordPayload {
  password: string;
  confirm_password: string;
}

export type IPasswordResponse =
  | IResponseError
  | IResponseSuccess<object>;


// redirecionamento

export interface IValidateAccountSuccess {
  id: number;
  email: string;
  activated: boolean;
  activation_code: string;
}

export type IValidateAccountToken =
  | IResponseError
  | IResponseSuccess<IValidateAccountSuccess>;

