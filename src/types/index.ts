// 安全检测结果类型
export interface SafetyCheckResult {
    code: number;
    msg: string;
    tips: string;
    Results: {
      ImageURL: string;
      SubResults: {
        Suggestion: string;
        Rate: number;
        Label: string;
        Scene: string;
      }[];
    }[];
}

// 安全检测结果类型
export interface SafetyCheckResResult {
    code: number;
    msg: string;
    data: SafetyCheckResult;
}

export interface CheckImageParams {
  imgUrl: string,
} 

// 菜谱工具
export interface GetFoodMenuParams {
  foodTitle: string,
}

export interface GetFoodMenuResult {
  code: number;
  msg: string;
  foodMenu: {
    intro: string;
    image: string;
    steps: any[];
    notice: string;
    ingredients: string[];
    duration: string;
    [key: string]: any;
  }[]
}

export interface GetFoodMenuResResult {
    code: number;
    msg: string;
    data: GetFoodMenuResult;
}